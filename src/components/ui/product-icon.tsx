import type { SVGProps } from "react";
import type { ProductIconId } from "@/shared/products/product-icons";
import styles from "./icon.module.css";
const paths = {
  meat: (
    <>
      <path d="M5 7c6-6 16-3 16 4 0 6-9 11-14 9C1 18 1 11 5 7Z" />
      <path d="M9 9c4-3 8-1 7 2s-5 5-7 3-2-3 0-5Z" />
    </>
  ),
  chicken: (
    <>
      <path d="m8 14-4 4M3 17c-3 0-2 5 1 4 1 3 6 2 4-1l4-4M10 5c4-4 12 1 11 6-1 6-7 8-11 4S7 8 10 5Z" />
    </>
  ),
  fish: (
    <>
      <path d="M5 12c4-8 12-8 17 0-5 8-13 8-17 0ZM5 12 1 7v10l4-5ZM12 5l3-3 2 5M12 19l3 3 2-5" />
      <circle cx="18" cy="11" r="1" />
    </>
  ),
  egg: <path d="M20 15c0 10-16 10-16 0C4 9 9 2 12 2s8 7 8 13Z" />,
  seeds: (
    <>
      <path d="M5 13c-4-7 3-13 6-7s-1 12-6 7ZM15 21c-5-4-2-12 3-10s2 13-3 10ZM4 20l5-4M15 9l4-4" />
    </>
  ),
  grain: (
    <>
      <path d="M12 22V4M12 8C5 9 4 4 4 4c7-1 8 4 8 4ZM12 14c-7 1-8-4-8-4 7-1 8 4 8 4ZM12 19c7 1 8-4 8-4-7-1-8 4-8 4ZM12 12c7 1 8-4 8-4-7-1-8 4-8 4Z" />
    </>
  ),
  carrot: (
    <>
      <path d="M3 21 9 5c4-4 10 2 6 6L3 21ZM13 5l1-4M16 7l5-1M8 10l3 3M6 15l2 2" />
    </>
  ),
  cutlery: (
    <>
      <path d="M3 2v7h6V2M6 9v13M6 2v5M16 2v20M16 2c-5 4-5 10 0 10M21 2v20" />
    </>
  ),
  pan: (
    <>
      <path d="M5 9h14v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9ZM2 12h3M19 12h3M4 6h16M10 6V3h4v3" />
    </>
  ),
  plate: (
    <>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
    </>
  ),
  spoon: (
    <>
      <ellipse cx="12" cy="7" rx="4" ry="5" />
      <path d="M12 12v10" />
    </>
  ),
  milk: (
    <>
      <path d="M7 2h10v4l3 4v12H4V10l3-4V2ZM7 6h10M4 10h16M8 14h8v5H8z" />
    </>
  ),
  water: (
    <path d="M12 2c-3 5-8 10-8 14a8 6 0 0 0 16 0c0-4-5-9-8-14ZM8 15c-1 2 0 4 2 4" />
  ),
  fridge: (
    <>
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <path d="M5 9h14M8 5v2M8 12v4" />
    </>
  ),
  blender: (
    <>
      <path d="M6 2h12l-2 12H8L6 2ZM8 14h8l3 8H5l3-8ZM18 4h3v6h-4M9 2V1h6v1M10 18h4" />
    </>
  ),
  meal: (
    <>
      <path d="M4 3v7h5V3M6.5 10v11M17 3v18M17 3c-5 4-5 10 0 10" />
    </>
  ),
  burger: (
    <>
      <path d="M3 10h18a9 7 0 0 0-18 0ZM3 14h18M4 18h16l-1 3H5l-1-3Z" />
      <path d="m6 11 3 3 3-3 3 3 3-3" />
    </>
  ),
  pizza: (
    <>
      <path d="M3 20 10 3c5 0 9 3 11 7L3 20ZM10 6c4 0 6 2 8 5" />
      <circle cx="10" cy="12" r="1" />
      <circle cx="7" cy="16" r="1" />
    </>
  ),
  cake: (
    <>
      <path d="M3 12h18v9H3zM3 15c3 4 4-3 7 0s4-3 7 0 4 0 4 0M7 12V8h10v4M12 8V4M12 2v1" />
    </>
  ),
  bread: (
    <>
      <path d="M5 10c-5-6 1-9 7-6 6-3 12 0 7 6v11H5V10Z" />
    </>
  ),
  fruit: (
    <>
      <path d="M12 8c-8-5-12 4-6 11 4 5 5 0 6 1 4 4 7-2 8-6 2-6-4-9-8-6ZM12 8V3M12 5c3-4 6-3 6-3-1 4-3 4-6 3" />
    </>
  ),
  icecream: (
    <>
      <path d="m7 13 5 9 5-9M5 12h14c2-4-1-6-3-6 0-6-8-6-8 0-3 0-5 3-3 6Z" />
    </>
  ),
  coffee: (
    <>
      <path d="M4 8h13v9a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8ZM17 9h2a3 3 0 0 1 0 6h-2M8 2v3M12 2v3" />
    </>
  ),
  cup: (
    <>
      <path d="m5 7 2 14h10l2-14H5ZM13 7l3-5h4M7 12h10" />
    </>
  ),
  bottle: (
    <>
      <path d="M9 2h6v5l3 4v10H6V11l3-4V2ZM9 5h6M6 13h12M6 18h12" />
    </>
  ),
  soda: (
    <>
      <path d="M8 3h8l2 3v15H6V6l2-3ZM8 3v3h8M10 10h4M9 14h6M9 18h6" />
    </>
  ),
  phone: (
    <>
      <rect x="6" y="2" width="12" height="20" rx="2" />
      <path d="M10 5h4M11 19h2" />
    </>
  ),
  laptop: (
    <>
      <path d="M5 4h14v12H5V4ZM5 16l-3 4h20l-3-4" />
    </>
  ),
  headphones: (
    <>
      <path d="M3 14v-3a9 9 0 0 1 18 0v3M3 12h4v9H3zM17 12h4v9h-4z" />
    </>
  ),
  camera: (
    <>
      <path d="M3 7h4l2-4h6l2 4h4v14H3V7Z" />
      <circle cx="12" cy="13" r="4" />
    </>
  ),
  game: (
    <>
      <path d="M7 7h10c5 0 7 13 3 13l-5-4H9l-5 4C0 20 2 7 7 7Z M5 11h5M7.5 9v5M16 11h1M18 14h1" />
    </>
  ),
  gift: (
    <>
      <path d="M3 8h18v5H3zM5 13v8h14v-8M12 8v13M12 8C3 8 5 0 9 3l3 5c9 0 7-8 3-5l-3 5Z" />
    </>
  ),
  shirt: (
    <>
      <path d="m8 3-6 4 3 5 3-2v11h8V10l3 2 3-5-6-4c0 5-8 5-8 0Z" />
    </>
  ),
  book: (
    <>
      <path d="M3 4c4-2 7-1 9 1 2-2 5-3 9-1v16c-4-2-7-1-9 1-2-2-5-3-9-1V4ZM12 5v16" />
    </>
  ),
  flower: (
    <>
      <path d="M12 13v9M12 20c-5 1-7-3-7-3 4-1 7 3 7 3M12 17c5 1 7-3 7-3-4-1-7 3-7 3" />
      <circle cx="12" cy="8" r="2" />
      <path d="M10 5c-2-5 6-5 4 0 5-2 6 6 1 5 2 5-6 6-6 1-5 2-6-6-1-6h2Z" />
    </>
  ),
  toy: (
    <>
      <path d="m7 9-3-4 4-3 3 5M13 7l3-5 4 3-3 4M5 11c0-6 14-6 14 0v8H5v-8ZM9 12h1M14 12h1M9 16h6" />
    </>
  ),
  bag: (
    <>
      <path d="M4 7h16l-1 15H5L4 7ZM8 7V5a4 4 0 0 1 8 0v2" />
    </>
  ),
};
export function ProductIcon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: ProductIconId }) {
  return (
    <svg
      {...props}
      className={styles.root}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? paths.meal}
    </svg>
  );
}
