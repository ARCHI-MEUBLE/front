export interface CatalogueItemDetail {
  id: number;
  name: string;
  category: string;
  description: string;
  material: string;
  dimensions: string;
  unit_price: number;
  unit: string;
  min_order_quantity: number;
  image_url: string;
  weight: number;
  tags: string;
  variation_label?: string;
  variations?: { id: number; color_name: string; image_url: string; is_default: number }[];
}
