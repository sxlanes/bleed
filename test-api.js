const apiKey = "e7e6e4f5d4msh9bde1e79238be7cp15857ajsn82643e742b31";
const url = "https://similarweb-insights.p.rapidapi.com/get-traffic?domain=go-erasmus.com";
fetch(url, { headers: { "x-rapidapi-key": apiKey, "x-rapidapi-host": "similarweb-insights.p.rapidapi.com" }})
  .then(res => res.text().then(text => console.log(res.status, text)));
