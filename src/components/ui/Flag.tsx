// Componente de bandera que usa imágenes reales desde flagcdn.com
// Resuelve el problema de que Windows no renderiza emojis de banderas

interface FlagProps {
  iso2: string;
  name: string;
  size?: "sm" | "md" | "lg";
}

// flagcdn solo soporta anchos específicos: 20, 40, 80, 160, 320, etc.
const sizeMap = {
  sm: { urlW: 20, url2x: 40, className: "w-5 h-[15px]" },
  md: { urlW: 40, url2x: 80, className: "w-7 h-[21px]" },
  lg: { urlW: 80, url2x: 160, className: "w-10 h-[30px]" },
};

export default function Flag({ iso2, name, size = "md" }: FlagProps) {
  const s = sizeMap[size];
  const src = `https://flagcdn.com/w${s.urlW}/${iso2}.png`;
  const srcSet = `https://flagcdn.com/w${s.url2x}/${iso2}.png 2x`;

  return (
    <img
      src={src}
      srcSet={srcSet}
      alt={`Bandera de ${name}`}
      className={`${s.className} rounded-sm object-cover inline-block shrink-0`}
      loading="lazy"
    />
  );
}
