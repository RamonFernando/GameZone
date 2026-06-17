import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import styles from "./AuthMediaPanel.module.scss";

interface AuthMediaPanelProps {
  tag: ReactNode;
  text: ReactNode;
  /** Imagen de fondo con next/image (login, register) */
  image?: { src: string; alt: string; sizes?: string };
  /** Override de backgroundImage para fondos dinámicos (página de cuenta) */
  gradientStyle?: CSSProperties;
}

export function AuthMediaPanel({ tag, text, image, gradientStyle }: AuthMediaPanelProps) {
  return (
    <div className={styles.authMediaPanel}>
      <div className={styles.authMediaInner}>
        {image ? (
          <Image
            src={image.src}
            alt={image.alt}
            fill
            priority
            className={styles.authMediaImage}
            sizes={image.sizes ?? "(min-width: 1024px) 480px, 100vw"}
          />
        ) : null}

        <div
          className={styles.authMediaGradient}
          style={gradientStyle}
        />

        <div className={styles.authMediaBrand}>
          <span className={styles.authMediaTag}>{tag}</span>
          <span className={styles.authMediaText}>{text}</span>
        </div>
      </div>
    </div>
  );
}
