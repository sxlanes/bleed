import json, re, ssl, socket, time, urllib.request, urllib.parse
from concurrent.futures import ThreadPoolExecutor

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"
ctx = ssl.create_default_context(); ctx.check_hostname=False; ctx.verify_mode=ssl.CERT_NONE

def get(url, timeout=15, maxb=3_000_000):
    req = urllib.request.Request(url, headers={"User-Agent":UA,"Accept-Language":"es-ES,es;q=0.9"})
    t0=time.time()
    with urllib.request.urlopen(req, timeout=timeout, context=ctx) as r:
        body = r.read(maxb)
        return r.status, dict(r.headers), body, time.time()-t0, r.geturl()

AGG = {"just-eat":"JustEat","justeat":"JustEat","glovoapp":"Glovo","glovo":"Glovo",
       "ubereats":"UberEats","uber.com/es":"UberEats","deliveroo":"Deliveroo"}

def audit(rec):
    name, url = rec
    out = {"name":name,"url":url}
    try:
        st, h, body, ttfb, final = get(url)
    except Exception as e:
        out["error"]=type(e).__name__+": "+str(e)[:80]; return out
    html = body.decode("utf-8","ignore")
    low = html.lower()
    out["status"]=st; out["ttfb"]=round(ttfb,2); out["final"]=final
    out["https"]=final.startswith("https")
    out["html_kb"]=round(len(body)/1024)
    out["viewport"]= "name=\"viewport\"" in low or "name='viewport'" in low
    out["wordpress"]= "wp-content" in low or "wp-json" in low
    out["woocommerce"]= "woocommerce" in low
    out["aggregators"]=sorted({v for k,v in AGG.items() if k in low})
    out["own_order"]= any(k in low for k in ["add-to-cart","/carrito","/cart","checkout","finalizar-compra","pedir online","haz tu pedido","pedido online"])
    out["whatsapp"]= "wa.me" in low or "api.whatsapp" in low
    out["reserva"]= any(k in low for k in ["covermanager","thefork","opentable","resdiary","reservar mesa"])
    # image weight from html
    imgs = re.findall(r'<img[^>]+src=["\']([^"\']+)', html, re.I)[:25]
    base = final
    total=0; heavy=[]
    def head(u):
        try:
            u = urllib.parse.urljoin(base,u)
            if not u.startswith("http"): return None
            req=urllib.request.Request(u, method="HEAD", headers={"User-Agent":UA})
            with urllib.request.urlopen(req, timeout=8, context=ctx) as r:
                return u, int(r.headers.get("Content-Length") or 0)
        except Exception: return None
    with ThreadPoolExecutor(8) as ex:
        for res in ex.map(head, imgs):
            if res:
                u,n=res; total+=n
                if n>500_000: heavy.append((u.split("/")[-1][:40], round(n/1024)))
    out["img_kb"]=round(total/1024); out["heavy_imgs"]=heavy[:5]
    # WooCommerce Store API
    if out["woocommerce"]:
        root = "{u.scheme}://{u.netloc}".format(u=urllib.parse.urlparse(final))
        for path in ["/wp-json/wc/store/v1/products?per_page=1","/wp-json/wc/store/products?per_page=1"]:
            try:
                s,_,b,_,_ = get(root+path, timeout=10, maxb=200000)
                if s==200 and b.strip().startswith(b"["):
                    out["store_api"]=root+path
                    try: out["store_api_items"]=len(json.loads(b))
                    except Exception: pass
                    break
            except Exception: pass
    return out

els = json.load(open("malaga.json"))["elements"]
seen=set(); recs=[]
for e in els:
    t=e["tags"]; w=t.get("website","")
    if not w.startswith("http"): continue
    host=urllib.parse.urlparse(w).netloc.lower()
    if host in seen: continue
    seen.add(host); recs.append((t.get("name","?"), w))
print("auditando", len(recs))
with ThreadPoolExecutor(12) as ex:
    results=list(ex.map(audit, recs))
json.dump(results, open("audit_malaga.json","w"), ensure_ascii=False, indent=1)
ok=[r for r in results if not r.get("error")]
print("ok:",len(ok),"errores:",len(results)-len(ok))
