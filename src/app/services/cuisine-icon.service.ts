import { DOCUMENT } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';

/** Maps cuisine slugs to the original PNG filenames exported by the project owner. */
const CUISINE_ICON_FILES: Record<string, string> = {
  italian: 'Italian cuisine.png',
  german: 'German cuisine.png',
  japanese: 'Japanese cuisine.png',
  gourmet: 'Gourmet cuisine.png',
  indian: 'Indian cuisine.png',
  fusion: 'Fusion cuisine.png',
};

@Injectable({ providedIn: 'root' })
export class CuisineIconService {
  private readonly document = inject(DOCUMENT);
  private readonly loadedIcons = signal<Record<string, string>>({});
  readonly icons = this.loadedIcons.asReadonly();

  /** Loads only the owner's PNG exports; absent files never become broken images in the page. */
  constructor() {
    for (const [slug, filename] of Object.entries(CUISINE_ICON_FILES)) {
      this.loadIcon(slug, filename);
    }
  }

  /** Publishes a cuisine icon only after the original local asset loads successfully. */
  private loadIcon(slug: string, filename: string, retryDoubleExtension = true): void {
    const image = this.document.createElement('img');
    const source = new URL(`Icons/${filename}`, this.document.baseURI).toString();
    image.onload = () => {
      this.loadedIcons.update((icons) => ({ ...icons, [slug]: source }));
      image.onload = null;
      image.onerror = null;
    };
    image.onerror = () => {
      image.onload = null;
      image.onerror = null;
      // Windows can hide the real extension when the exported name already contains .png.
      if (retryDoubleExtension) this.loadIcon(slug, `${filename}.png`, false);
    };
    image.src = source;
  }
}
