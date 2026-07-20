import { createHash } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';

export interface PersistSongAudioInput {
  requestId: string;
  externalSongId?: string;
  title?: string;
  sourceUrls: Array<string | undefined>;
}

@Injectable()
export class AudioStorageService {
  private readonly logger = new Logger(AudioStorageService.name);
  private readonly storage = new Storage();

  async persistGeneratedAudio(input: PersistSongAudioInput): Promise<string> {
    const sourceUrl = input.sourceUrls.find((url): url is string => typeof url === 'string' && url.length > 0);
    if (!sourceUrl) throw new Error('Generated song did not include a downloadable audio URL');

    const bucketName = process.env.AUDIO_BUCKET_NAME;
    if (!bucketName) throw new Error('AUDIO_BUCKET_NAME is required to persist generated song audio');

    const response = await fetch(sourceUrl);
    if (!response.ok) {
      throw new Error(`Audio download failed with ${response.status} from ${sourceUrl}`);
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type')?.split(';')[0] || 'audio/mpeg';
    const extension = extensionForContentType(contentType) ?? extensionForUrl(sourceUrl) ?? '.mp3';
    const objectName = [
      'generated-songs',
      safePathPart(input.requestId),
      `${safePathPart(input.externalSongId ?? createHash('sha1').update(sourceUrl).digest('hex').slice(0, 12))}${extension}`
    ].join('/');

    await this.storage.bucket(bucketName).file(objectName).save(bytes, {
      contentType,
      resumable: false,
      metadata: {
        cacheControl: 'public, max-age=31536000, immutable',
        metadata: {
          title: input.title ?? '',
          sourceUrl
        }
      }
    });

    const publicUrl = publicAudioUrl(bucketName, objectName);
    this.logger.log(`Persisted generated audio for request ${input.requestId} to ${publicUrl}`);
    return publicUrl;
  }
}

function publicAudioUrl(bucketName: string, objectName: string) {
  const baseUrl = process.env.AUDIO_PUBLIC_BASE_URL?.replace(/\/$/, '');
  const encodedObjectName = objectName.split('/').map(encodeURIComponent).join('/');
  return baseUrl ? `${baseUrl}/${encodedObjectName}` : `https://storage.googleapis.com/${bucketName}/${encodedObjectName}`;
}

function safePathPart(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').slice(0, 120) || 'audio';
}

function extensionForContentType(contentType: string) {
  if (contentType === 'audio/mpeg' || contentType === 'audio/mp3') return '.mp3';
  if (contentType === 'audio/wav' || contentType === 'audio/x-wav') return '.wav';
  if (contentType === 'audio/mp4' || contentType === 'audio/aac') return '.m4a';
  if (contentType === 'audio/ogg') return '.ogg';
  if (contentType === 'audio/webm') return '.webm';
  return undefined;
}

function extensionForUrl(url: string) {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\.(mp3|wav|m4a|aac|ogg|webm)$/i);
    return match ? `.${match[1].toLowerCase()}` : undefined;
  } catch {
    return undefined;
  }
}
