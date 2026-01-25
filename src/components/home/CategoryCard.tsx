"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export type CategoryContent = {
  title: string;
  descriptions: string[];
  image: string;
  imageAlt: string;
};

type CategoryCardProps = {
  category: CategoryContent;
};

export function CategoryCard({ category }: CategoryCardProps) {
  return (
    <Link
      href="#contact"
      className="group block overflow-hidden rounded-2xl bg-white shadow-sm transition-all hover:shadow-lg"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        <Image
          src={category.image}
          alt={category.imageAlt}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
      </div>

      {/* Content */}
      <div className="p-6">
        <h3 className="text-xl font-semibold text-gray-900">
          {category.title}
        </h3>
        <p className="mt-2 text-sm text-gray-600 line-clamp-2">
          {category.descriptions[0]}
        </p>
        <div className="mt-4 flex items-center text-sm font-medium text-gray-900">
          Decouvrir
          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
}
