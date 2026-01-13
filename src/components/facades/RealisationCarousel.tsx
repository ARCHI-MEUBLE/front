"use client"

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Camera } from 'lucide-react';

interface RealisationImage {
  id: number;
  image_url: string;
  legende?: string;
  ordre: number;
}

interface Props {
  images: RealisationImage[];
  className?: string;
  onImageClick?: (imageUrl: string) => void;
}

export function RealisationCarousel({ images, className = '', onImageClick }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className={`relative aspect-[4/3] bg-[#E8E4DE] flex items-center justify-center ${className}`}>
        <Camera className="h-12 w-12 text-[#706F6C]" strokeWidth={1} />
      </div>
    );
  }

  const handlePrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleImageClick = () => {
    if (onImageClick && images[currentIndex]) {
      onImageClick(images[currentIndex].image_url);
    }
  };

  return (
    <div className={`relative aspect-[4/3] overflow-hidden bg-[#E8E4DE] group ${className}`}>
      {/* Image principale */}
      <AnimatePresence mode="wait">
        <motion.img
          key={currentIndex}
          src={images[currentIndex].image_url}
          alt={`Image ${currentIndex + 1}`}
          className="w-full h-full object-cover cursor-pointer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={handleImageClick}
        />
      </AnimatePresence>

      {/* Navigation (visible seulement s'il y a plusieurs images) */}
      {images.length > 1 && (
        <>
          {/* Bouton précédent */}
          <button
            onClick={handlePrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-white"
          >
            <ChevronLeft className="h-5 w-5 text-[#1A1917]" />
          </button>

          {/* Bouton suivant */}
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-white"
          >
            <ChevronRight className="h-5 w-5 text-[#1A1917]" />
          </button>

          {/* Indicateurs de pagination */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(index);
                }}
                className={`h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? 'w-8 bg-white'
                    : 'w-2 bg-white/50 hover:bg-white/75'
                }`}
                aria-label={`Aller à l'image ${index + 1}`}
              />
            ))}
          </div>

          {/* Compteur */}
          <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full">
            {currentIndex + 1} / {images.length}
          </div>
        </>
      )}
    </div>
  );
}

// Composant Lightbox pour afficher l'image en grand
export function ImageLightbox({ imageUrl, onClose }: { imageUrl: string | null; onClose: () => void }) {
  if (!imageUrl) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      {/* Bouton fermer */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors"
      >
        <X className="h-5 w-5 text-white" />
      </button>

      {/* Image */}
      <motion.img
        src={imageUrl}
        alt="Image agrandie"
        className="max-w-full max-h-[90vh] object-contain"
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
      />
    </motion.div>
  );
}
