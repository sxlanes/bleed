import styles from "./pagina.module.css";

export default function Portada() {
  return (
    <main className={styles.pagina}>
      <header className={`${styles.marca} entra`}>
        <span className={styles.nombre}>Bleed</span>
        <span className={styles.sello}>auditoría de fugas</span>
      </header>

      <section className={styles.centro}>
        <h1 className={`${styles.titular} entra entra-2`}>
          Tu web pierde dinero.
          <br />
          <em className={styles.enfasis}>Te decimos cuánto.</em>
        </h1>

        <p className={`${styles.entrada} entra entra-3`}>
          Tres de cada cuatro restaurantes españoles que reparten a domicilio lo
          hacen a través de un agregador que se lleva entre el 13 % y el 35 % de
          cada pedido. Casi todos tienen ya su propio canal, pagado y sin usar.
          Nadie les ha puesto nunca una cifra a eso.
        </p>

        <form className={`${styles.formulario} entra entra-4`} action="/informe">
          <label className={styles.etiqueta} htmlFor="url">
            La dirección de su web
          </label>
          <div className={styles.campo}>
            <input
              id="url"
              name="url"
              type="url"
              required
              placeholder="https://pizzeria-de-ejemplo.es"
              className={styles.input}
              autoComplete="off"
              spellCheck={false}
            />
            <button type="submit" className={styles.boton}>
              Auditar
            </button>
          </div>
          <p className={styles.pie}>
            Un minuto. Sin cuenta, sin tarjeta, sin instalar nada.
          </p>
        </form>
      </section>

      <footer className={styles.pieDePagina}>
        <p>
          Cada cifra enseña el supuesto del que sale. Cuando falta el dato del
          dueño, lo decimos en vez de inventarlo.
        </p>
      </footer>
    </main>
  );
}
