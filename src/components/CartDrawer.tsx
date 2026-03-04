// Panel lateral de carrito: lista los juegos añadidos y permite pagar o vaciar.
"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCart } from "@/contexts/CartContext";

// Props mínimos del CartDrawer: callback para cerrarlo.
type Props = {
  onClose: () => void;
};

// Componente que muestra el contenido actual del carrito en un drawer lateral.
export function CartDrawer({ onClose }: Props) {
  const router = useRouter();
  const {
    items,
    totalItems,
    addToCart,
    decreaseFromCart,
    removeFromCart,
    clearCart,
  } = useCart();

  // Indica si hay productos en el carrito o está vacío.
  const hasItems = items.length > 0;

  // Calcula el importe total del carrito sumando precioFinal * cantidad.
  const totalAmount = items.reduce(
    (sum, item) => sum + item.game.priceFinal * item.quantity,
    0
  );

  // Cierra el drawer y navega a la pantalla de checkout.
  const goToCheckout = () => {
    onClose();
    router.push("/checkout");
  };

  return (
    <div className="cart-drawer-backdrop" onClick={onClose}>
      <aside
        className="cart-drawer"
        onClick={(event) => event.stopPropagation()}
      >
        {/* NUEVO CONTENEDOR INTERNO */}
        <div className="cart-drawer-inner">

          {/* HEADER */}
          <header className="cart-drawer-header">
            <h2 className="cart-title">
              <span className="cart-icon-button cart-drawer-cart-icon-button">
                <Image
                  src="/iconos_platforms/carritoCompra2.svg"
                  alt="Carrito"
                  width={20}
                  height={20}
                  className="cart-drawer-cart-icon"
                />
              </span>
              Tu carrito
            </h2>

            <button type="button" className="button-ghost btn-padding-site" onClick={onClose}>
              Cerrar
            </button>
          </header>

          {/* BODY */}
          <div className="cart-drawer-body">
            {!hasItems && (
              <p className="cart-empty-text">
                Todavía no has añadido ningún juego. Busca tu título favorito y
                pulsa <strong>“Añadir”</strong> para agregarlo al carrito.
              </p>
            )}

            {hasItems &&
              items.map((item) => (
                <div key={item.slug} className="cart-item">
                  <div
                    style={{
                      position: "relative",
                      width: 64,
                      height: 64,
                      borderRadius: 12,
                      overflow: "hidden",
                      flexShrink: 0,
                    }}
                  >
                    <Image
                      src={item.game.coverImage}
                      alt={item.game.name}
                      fill
                      sizes="64px"
                      style={{ objectFit: "cover" }}
                    />
                  </div>

                  <div className="cart-item-info">
                    <div className="cart-item-title">{item.game.name}</div>

                    <div className="cart-item-actions">
                      <div className="qty-control">
                        <button
                          type="button"
                          className="button-ghost cart-inline-button btn-padding-site"
                          onClick={() => decreaseFromCart(item.slug)}
                        >
                          −
                        </button>

                        <span className="qty-value">
                          {item.quantity}
                        </span>

                        <button
                          type="button"
                          className="button-primary cart-inline-button btn-padding-site"
                          onClick={() => addToCart(item.game)}
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        className="button-ghost btn-padding-site"
                        onClick={() => removeFromCart(item.slug)}
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          {/* FOOTER */}
          {/* cart-drawer-footer */}
          <div className="cart-drawer-footer">
            <div className="cart-drawer-summary">
              <strong>Resumen</strong>
              <div>Total de juegos: {totalItems}</div>

              <div>
                Total:{" "}
                {totalAmount.toLocaleString("es-ES", {
                  style: "currency",
                  currency: "EUR",
                })}
              </div>
            </div>

            <div className="button-group cart-drawer-footer-button">
              {/* Botón principal: PAGAR */}
            <button
              type="button"
              className="button-primary cart-full-width btn-padding-site"
              disabled={!hasItems}
              onClick={goToCheckout}
            >
              Pagar ahora
            </button>

            {/* Botón secundario: VACIAR */}
            <button
              type="button"
              className="button-ghost cart-full-width btn-padding-site"
              onClick={clearCart}
            >
              Vaciar carrito
            </button>
            </div>
          </div>
        </div> {/* cart-drawer-inner */}
      
      </aside>
    </div>
  );
}
