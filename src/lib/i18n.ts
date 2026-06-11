type Lang = "es" | "en";

const dict = {
  es: {
    // GameGrid
    "grid.title": "Últimos lanzamientos",
    "grid.subtitle": "Juegos lanzados recientemente. ¡Descubre lo último en el mundo gaming!",
    "grid.view-all": "Ver todos →",
    "grid.back": "← Inicio",
    "grid.empty-catalog": "No hemos encontrado juegos con el título buscado. Prueba con otro título.",
    "grid.empty-query": (q: string) => `Sin resultados para «${q}»`,
    "grid.empty-no-query": "No se encontraron juegos.",
    "grid.clear-search": "Limpiar búsqueda",
    "grid.suggestions-label": "Puede que te interese:",

    // CartDrawer
    "cart.title": "Tu carrito",
    "cart.close": "Cerrar",
    "cart.empty": "Todavía no has añadido ningún juego. Busca tu título favorito y pulsa “Añadir” para agregarlo al carrito.",
    "cart.open-details": (name: string) => `Abrir detalles de ${name}`,
    "cart.decrease": (name: string) => `Reducir cantidad de ${name}`,
    "cart.increase": (name: string) => `Aumentar cantidad de ${name}`,
    "cart.remove": "Quitar",
    "cart.summary": "Resumen",
    "cart.total-items": "Total de juegos:",
    "cart.total": "Total:",
    "cart.checkout": "Pagar ahora",
    "cart.clear": "Vaciar carrito",
    "cart.aria-label": "Carrito de compra",

    // Header (cart button)
    "header.cart-open": (n: number) => `Abrir carrito, ${n} artículos`,

    // Shared
    "nav.platforms": "Plataformas",
    "nav.language": "Idioma y moneda",
    "nav.open-menu": "Abrir menú",
    "nav.close-menu": "Cerrar menú",
    "nav.game-images": "Imagenes del juego",
    "nav.show-image": (n: number) => `Mostrar imagen ${n}`,
  },
  en: {
    "grid.title": "Latest releases",
    "grid.subtitle": "Recently released games. Discover the latest in the gaming world!",
    "grid.view-all": "View all →",
    "grid.back": "← Back",
    "grid.empty-catalog": "We couldn't find games with that title. Try another one.",
    "grid.empty-query": (q: string) => `No results for "${q}"`,
    "grid.empty-no-query": "No games found.",
    "grid.clear-search": "Clear search",
    "grid.suggestions-label": "You might like:",

    "cart.title": "Your cart",
    "cart.close": "Close",
    "cart.empty": "You haven’t added any games yet. Find your favorite title and click “Add” to put it in the cart.",
    "cart.open-details": (name: string) => `Open details for ${name}`,
    "cart.decrease": (name: string) => `Decrease quantity of ${name}`,
    "cart.increase": (name: string) => `Increase quantity of ${name}`,
    "cart.remove": "Remove",
    "cart.summary": "Summary",
    "cart.total-items": "Total games:",
    "cart.total": "Total:",
    "cart.checkout": "Checkout now",
    "cart.clear": "Empty cart",
    "cart.aria-label": "Shopping cart",

    "header.cart-open": (n: number) => `Open cart, ${n} items`,

    "nav.platforms": "Platforms",
    "nav.language": "Language and currency",
    "nav.open-menu": "Open menu",
    "nav.close-menu": "Close menu",
    "nav.game-images": "Game images",
    "nav.show-image": (n: number) => `Show image ${n}`,
  },
} as const;

type DictEs = typeof dict.es;
type DictEn = typeof dict.en;
type Keys = keyof DictEs & keyof DictEn;

export function t<K extends Keys>(lang: Lang, key: K): DictEs[K] {
  return dict[lang][key] as DictEs[K];
}
