"use client"

import { useState, useEffect, type ChangeEvent } from 'react';
import toast from 'react-hot-toast';
import {
  IconPhoto,
  IconTrash,
  IconArrowUp,
  IconArrowDown,
  IconUpload,
  IconX,
} from '@tabler/icons-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface RealisationImage {
  id: number;
  realisation_id: number;
  image_url: string;
  legende?: string;
  ordre: number;
}

interface Props {
  realisationId: number;
  isOpen: boolean;
  onClose: () => void;
}

export function RealisationImagesDialog({ realisationId, isOpen, onClose }: Props) {
  const [images, setImages] = useState<RealisationImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && realisationId) {
      fetchImages();
    }
  }, [isOpen, realisationId]);

  const fetchImages = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/backend/api/admin/realisation-images.php?realisation_id=${realisationId}`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setImages(data.images || []);
      }
    } catch (error) {
      console.error('Erreur chargement images:', error);
      toast.error('Erreur lors du chargement des images');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadingFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!uploadingFile) return;

    try {
      // Upload de l'image
      const formData = new FormData();
      formData.append('image', uploadingFile);
      
      const uploadRes = await fetch('/api/admin/upload-image', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!uploadRes.ok) {
        throw new Error('Erreur lors de l\'upload de l\'image');
      }

      const uploadData = await uploadRes.json();

      // Ajouter l'image à la réalisation
      const response = await fetch('/backend/api/admin/realisation-images.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          realisation_id: realisationId,
          image_url: uploadData.url,
          ordre: images.length
        }),
        credentials: 'include'
      });

      if (response.ok) {
        toast.success('Image ajoutée avec succès');
        fetchImages();
        setUploadingFile(null);
        setPreview(null);
      } else {
        throw new Error('Erreur lors de l\'ajout de l\'image');
      }
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de l\'upload');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer cette image ?')) return;

    try {
      const response = await fetch(`/backend/api/admin/realisation-images.php?id=${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        toast.success('Image supprimée');
        fetchImages();
      } else {
        throw new Error('Erreur lors de la suppression');
      }
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleMoveUp = async (image: RealisationImage, index: number) => {
    if (index === 0) return;

    const previousImage = images[index - 1];
    const newOrder = previousImage.ordre;

    try {
      await fetch('/backend/api/admin/realisation-images.php', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: image.id,
          ordre: newOrder
        }),
        credentials: 'include'
      });

      await fetch('/backend/api/admin/realisation-images.php', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: previousImage.id,
          ordre: image.ordre
        }),
        credentials: 'include'
      });

      fetchImages();
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors du déplacement');
    }
  };

  const handleMoveDown = async (image: RealisationImage, index: number) => {
    if (index === images.length - 1) return;

    const nextImage = images[index + 1];
    const newOrder = nextImage.ordre;

    try {
      await fetch('/backend/api/admin/realisation-images.php', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: image.id,
          ordre: newOrder
        }),
        credentials: 'include'
      });

      await fetch('/backend/api/admin/realisation-images.php', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: nextImage.id,
          ordre: image.ordre
        }),
        credentials: 'include'
      });

      fetchImages();
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors du déplacement');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gérer les images de la réalisation</DialogTitle>
          <DialogDescription>
            Ajoutez plusieurs photos et réorganisez-les. La première image sera l'image principale.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Zone d'upload */}
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <IconPhoto className="mx-auto mb-4 text-muted-foreground" size={48} />
            <Label htmlFor="upload-image" className="cursor-pointer">
              <div className="text-sm text-muted-foreground mb-2">
                Cliquez pour sélectionner une image ou glissez-la ici
              </div>
              <Input
                id="upload-image"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </Label>

            {preview && (
              <div className="mt-4 space-y-4">
                <img src={preview} alt="Preview" className="mx-auto max-h-48 rounded-lg object-contain" />
                <div className="flex gap-2 justify-center">
                  <Button onClick={handleUpload} size="sm">
                    <IconUpload className="mr-2" size={16} />
                    Ajouter cette image
                  </Button>
                  <Button 
                    onClick={() => { setUploadingFile(null); setPreview(null); }} 
                    variant="outline" 
                    size="sm"
                  >
                    <IconX className="mr-2" size={16} />
                    Annuler
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Liste des images */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Chargement...</div>
          ) : images.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucune image pour cette réalisation
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {images.map((image, index) => (
                <div key={image.id} className="relative border rounded-lg overflow-hidden group">
                  <img 
                    src={image.image_url} 
                    alt={`Image ${index + 1}`} 
                    className="w-full h-48 object-cover"
                  />
                  
                  {/* Badge "Image principale" */}
                  {index === 0 && (
                    <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                      Image principale
                    </div>
                  )}

                  {/* Contrôles */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={() => handleMoveUp(image, index)}
                      disabled={index === 0}
                    >
                      <IconArrowUp size={16} />
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={() => handleMoveDown(image, index)}
                      disabled={index === images.length - 1}
                    >
                      <IconArrowDown size={16} />
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={() => handleDelete(image.id)}
                    >
                      <IconTrash size={16} />
                    </Button>
                  </div>

                  {/* Numéro d'ordre */}
                  <div className="absolute bottom-2 right-2 bg-white text-black text-xs px-2 py-1 rounded">
                    {index + 1} / {images.length}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose} variant="outline">Fermer</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
