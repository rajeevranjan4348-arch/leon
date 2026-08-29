import { z } from "zod";

export const brandKitAssetTypeSchema = z.enum(["logo", "font", "color_palette", "guidelines"]);

export const brandKitAssetSchema = z.object({
  id: z.string(),
  brandKitId: z.string(),
  assetType: brandKitAssetTypeSchema,
  name: z.string(),
  textContent: z.string().nullable().optional(),
  fileUrl: z.string().nullable().optional(),
  fileMimeType: z.string().nullable().optional(),
  fileSize: z.number().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const brandKitSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  isDefault: z.boolean().default(false),
  assets: z.array(brandKitAssetSchema).default([]),
});

export type BrandKitAssetType = z.infer<typeof brandKitAssetTypeSchema>;
export type BrandKitAsset = z.infer<typeof brandKitAssetSchema>;
export type BrandKit = z.infer<typeof brandKitSchema>;
