import { NotFoundError, paginate, type Paginated, type Product, type ProductQuery } from '@ecom/shared';
import { seedProducts } from '../data/products.js';

/**
 * The catalogue lives in memory, cloned from the seed so tests (and a future
 * write path) cannot mutate the source module.
 */
let catalogue: Product[] = structuredClone(seedProducts);

export function reset(): void {
  catalogue = structuredClone(seedProducts);
}

export function all(): Product[] {
  return catalogue;
}

export function findById(id: string): Product | undefined {
  return catalogue.find((product) => product.id === id);
}

/** The storefront links by slug, so /products/:id accepts either. */
export function findByIdOrSlug(idOrSlug: string): Product | undefined {
  return catalogue.find((product) => product.id === idOrSlug || product.slug === idOrSlug);
}

export function requireById(idOrSlug: string): Product {
  const product = findByIdOrSlug(idOrSlug);

  if (!product) {
    throw new NotFoundError('Product');
  }

  return product;
}

export function findManyByIds(ids: string[]): Product[] {
  const wanted = new Set(ids);
  return catalogue.filter((product) => wanted.has(product.id));
}

function matchesSearch(product: Product, term: string): boolean {
  const haystack = [product.title, product.brand, product.description, ...product.tags]
    .join(' ')
    .toLowerCase();

  // Every word must appear somewhere, so "aurora headphones" narrows rather
  // than widens the result set.
  return term
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

const comparators: Record<ProductQuery['sort'], (a: Product, b: Product) => number> = {
  newest: (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  'price-asc': (a, b) => a.price - b.price,
  'price-desc': (a, b) => b.price - a.price,
  rating: (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount,
};

export function search(query: ProductQuery): Paginated<Product> {
  const { q, category, minPrice, maxPrice, sort, page, limit } = query;

  const filtered = catalogue.filter((product) => {
    if (category && product.category !== category) return false;
    if (minPrice !== undefined && product.price < minPrice) return false;
    if (maxPrice !== undefined && product.price > maxPrice) return false;
    if (q && !matchesSearch(product, q)) return false;
    return true;
  });

  return paginate(filtered.sort(comparators[sort]), page, limit);
}

/** Same category first, then anything from the same brand, capped at `limit`. */
export function related(product: Product, limit = 4): Product[] {
  const sameCategory = catalogue.filter(
    (candidate) => candidate.id !== product.id && candidate.category === product.category
  );

  const sameBrand = catalogue.filter(
    (candidate) =>
      candidate.id !== product.id &&
      candidate.brand === product.brand &&
      candidate.category !== product.category
  );

  return [...sameCategory, ...sameBrand].slice(0, limit);
}

export interface CategorySummary {
  name: Product['category'];
  count: number;
  /** Cheapest item in the category — drives the "from $X" label on the tiles. */
  fromPrice: number;
  image: string;
}

export function categories(): CategorySummary[] {
  const grouped = new Map<Product['category'], Product[]>();

  for (const product of catalogue) {
    const bucket = grouped.get(product.category);
    if (bucket) bucket.push(product);
    else grouped.set(product.category, [product]);
  }

  return [...grouped.entries()]
    .map(([name, items]) => ({
      name,
      count: items.length,
      fromPrice: Math.min(...items.map((item) => item.price)),
      image: items[0]?.image ?? '',
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function priceRange(): { min: number; max: number } {
  const prices = catalogue.map((product) => product.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}
