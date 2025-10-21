import type { ProductModel } from "@/components/ProductCard";
async function handleResponse(response: Response) {
  if (!response.ok) {
    throw new Error("Erreur de chargement");
  }
  const data = (await response.json()) as ProductModel[];
  return data;
  }

export async function fetchModels(): Promise<ProductModel[]> {
  const res = await fetch("/api/models");
  return handleResponse(res);
}
