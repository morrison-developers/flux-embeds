import { v2 as cloudinary } from 'cloudinary';
import { NextResponse } from 'next/server';
import { apiError } from '@/src/server/api/errors';
import {
  isEnvConfigError,
  validateCloudinaryGalleryEnv,
} from '@/src/server/env';

type CloudinaryResource = {
  public_id?: unknown;
  secure_url?: unknown;
  width?: unknown;
  height?: unknown;
};

type CloudinaryResourcesResponse = {
  resources?: CloudinaryResource[];
  next_cursor?: string;
};

function toGalleryImage(resource: CloudinaryResource) {
  if (
    typeof resource.public_id !== 'string' ||
    typeof resource.secure_url !== 'string' ||
    typeof resource.width !== 'number' ||
    typeof resource.height !== 'number'
  ) {
    return null;
  }

  return {
    id: resource.public_id,
    name: resource.public_id,
    url: resource.secure_url,
    width: resource.width,
    height: resource.height,
  };
}

export async function GET() {
  try {
    const env = validateCloudinaryGalleryEnv();

    cloudinary.config({
      cloud_name: env.cloudName,
      api_key: env.apiKey,
      api_secret: env.apiSecret,
    });

    const images = [];
    let nextCursor: string | undefined;

    do {
      const response = (await cloudinary.api.resources({
        type: 'upload',
        resource_type: 'image',
        max_results: 500,
        next_cursor: nextCursor,
        ...(env.prefix ? { prefix: env.prefix } : {}),
      })) as CloudinaryResourcesResponse;

      for (const resource of response.resources ?? []) {
        const image = toGalleryImage(resource);
        if (image) images.push(image);
      }

      nextCursor = response.next_cursor;
    } while (nextCursor);

    return NextResponse.json({
      folderName: env.collection,
      images,
    });
  } catch (error) {
    if (isEnvConfigError(error)) {
      console.error('[shavon-lloyd-gallery] missing Cloudinary env', error);
    } else {
      console.error('[shavon-lloyd-gallery] failed to fetch gallery', error);
    }

    return apiError(500, 'Failed to fetch gallery.', 'INTERNAL');
  }
}
