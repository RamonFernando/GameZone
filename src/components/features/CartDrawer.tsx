// Panel lateral de carrito: lista los juegos añadidos y permite pagar o vaciar.
"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/contexts/CartContext";
import { formatPublicPrice } from "@/lib/public-price";
import { useLocale } from "@/hooks/useLocale";
import { t } from "@/lib/i18n";
import styles from "./CartDrawer.module.scss";

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
  const lang = useLocale();

  const drawerRef = useRef<HTMLElement>(null);

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Focus trap: mantener foco dentro del drawer mientras está abierto
  useEffect(() => {
    const el = drawerRef.current;
    if (!el) return;
    const focusable = el.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    el.addEventListener("keydown", handleTab);
    return () => el.removeEventListener("keydown", handleTab);
  }, []);

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

  const openGameDetail = (slug: string) => {
    onClose();
    router.push(`/games/${slug}`);
  };

  return (
    <div className={styles.cartDrawerBackdrop} onClick={onClose}>
      <aside
        className={styles.cartDrawer}
        role="dialog"
        aria-modal="true"
        aria-label={t(lang, "cart.aria-label")}
        ref={drawerRef}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.cartDrawerInner}>

          <header className={styles.cartDrawerHeader}>
            <h2 className={styles.cartTitle}>
              <span className={`cart-icon-button ${styles.cartDrawerCartIconButton}`}>
                <Image
                  src="/iconos_platforms/carritoCompra2.svg"
                  alt=""
                  aria-hidden="true"
                  width={20}
                  height={20}
                  className={styles.cartDrawerCartIcon}
                />
              </span>
              {t(lang, "cart.title")}
            </h2>
            <button type="button" className="button-ghost btn-padding-site" onClick={onClose}>
              {t(lang, "cart.close")}
            </button>
          </header>

          <div className={styles.cartDrawerBody}>
            {!hasItems && (
              <p className={styles.cartEmptyText}>
                {t(lang, "cart.empty")}
              </p>
            )}

            {hasItems &&
              items.map((item) => (
                <div
                  key={item.slug}
                  className={`${styles.cartItem} ${styles.cartItemClickable}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => openGameDetail(item.slug)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openGameDetail(item.slug);
                    }
                  }}
                  aria-label={t(lang, "cart.open-details")(item.game.name)}
                >
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
                      quality={100}
                      unoptimized
                      style={{ objectFit: "cover" }}
                    />
                  </div>

                  <div className={styles.cartItemInfo}>
                    <div className={styles.cartItemTitle}>{item.game.name}</div>

                    <div className={styles.cartItemActions}>
                      <div className={styles.qtyControl}>
                        <button
                          type="button"
                          className={`button-ghost ${styles.cartInlineButton} btn-padding-site`}
                          onClick={(event) => {
                            event.stopPropagation();
                            decreaseFromCart(item.slug);
                          }}
                          aria-label={t(lang, "cart.decrease")(item.game.name)}
                        >
                          −
                        </button>

                        <span className={styles.qtyValue} aria-live="polite">
                          {item.quantity}
                        </span>

                        <button
                          type="button"
                          className={`button-primary ${styles.cartInlineButton} btn-padding-site`}
                          onClick={(event) => {
                            event.stopPropagation();
                            addToCart(item.game);
                          }}
                          aria-label={t(lang, "cart.increase")(item.game.name)}
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        className="button-ghost btn-padding-site"
                        onClick={(event) => {
                          event.stopPropagation();
                          removeFromCart(item.slug);
                        }}
                      >
                        {t(lang, "cart.remove")}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          <div className={styles.cartDrawerFooter}>
            <div className={styles.cartDrawerSummary}>
              <strong>{t(lang, "cart.summary")}</strong>
              <div>{t(lang, "cart.total-items")} {totalItems}</div>
              <div>{t(lang, "cart.total")}{" "}{formatPublicPrice(totalAmount, lang)}</div>
            </div>

            <div className={styles.buttonGroup}>
              <button
                type="button"
                className={`button-primary ${styles.cartFullWidth} btn-padding-site`}
                disabled={!hasItems}
                onClick={goToCheckout}
              >
                {t(lang, "cart.checkout")}
              </button>
              <button
                type="button"
                className={`button-ghost ${styles.cartFullWidth} btn-padding-site`}
                onClick={clearCart}
              >
                {t(lang, "cart.clear")}
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
