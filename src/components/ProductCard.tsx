import { type ArtSubject, bannerSources, FALLBACK_ART, flagSrc } from '../art';

interface Props {
  subject: ArtSubject;
  title: string;
  /** "∞ GB · 5 days". */
  detail?: string;
  /** Shown at the end, such as a price. */
  aside?: string;
}

/** What's being bought or was bought: the destination's art, its flag, and the package. */
export function ProductCard({ subject, title, detail, aside }: Props) {
  const { src, srcSet } = bannerSources(subject);
  return (
    <div className="product">
      <img
        className="product__art"
        src={src}
        srcSet={srcSet}
        sizes="480px"
        alt=""
        aria-hidden
        onError={(e) => {
          const img = e.currentTarget;
          if (img.src === FALLBACK_ART) return;
          img.srcset = '';
          img.src = FALLBACK_ART;
        }}
      />
      <div className="product__body">
        <img className="product__flag" src={flagSrc(subject)} alt="" width={40} height={40} />
        <div className="product__text">
          <strong>{title}</strong>
          {detail ? <span>{detail}</span> : null}
        </div>
        {aside ? <span className="product__aside">{aside}</span> : null}
      </div>
    </div>
  );
}
