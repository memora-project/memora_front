import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  type ImageProps,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { fetchWithAuth } from '../api/client';
import { imageSource, resolveImageUrl } from '../api/files';

type Props = Omit<ImageProps, 'source'> & {
  path: string | null | undefined;
};

// Base64 data URIs use more memory than the original bytes. Keep only the
// current and previous detail image so low-memory Android devices stay stable.
const MAX_CACHE_ENTRIES = 2;
const dataUriCache = new Map<string, string>();

const remember = (key: string, value: string) => {
  if (dataUriCache.has(key)) dataUriCache.delete(key);
  dataUriCache.set(key, value);
  while (dataUriCache.size > MAX_CACHE_ENTRIES) {
    const oldest = dataUriCache.keys().next().value;
    if (oldest === undefined) break;
    dataUriCache.delete(oldest);
  }
};

const blobToDataUri = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('사진 데이터를 변환하지 못했습니다.'));
    reader.onerror = () => reject(new Error('사진 데이터를 읽지 못했습니다.'));
    reader.readAsDataURL(blob);
  });

/**
 * Loads protected images through fetch first, then renders a data URI.
 * This avoids the Android Image/Fresco path that can drop Authorization
 * headers when the same protected URL is rendered again in a modal.
 */
const AuthenticatedImage: React.FC<Props> = ({ path, style, ...imageProps }) => {
  const [dataUri, setDataUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const protectedPath = path?.startsWith('/api/v1/files/images/') === true;

  useEffect(() => {
    let cancelled = false;
    setError(null);

    if (!path || !protectedPath) {
      setDataUri(null);
      return () => {
        cancelled = true;
      };
    }

    const cached = dataUriCache.get(path);
    if (cached) {
      setDataUri(cached);
      return () => {
        cancelled = true;
      };
    }

    setDataUri(null);
    const load = async () => {
      const response = await fetchWithAuth(resolveImageUrl(path));
      if (!response.ok) {
        throw new Error(`사진 요청 실패 (HTTP ${response.status})`);
      }

      const blob = await response.blob();
      const result = await blobToDataUri(blob);
      if (!cancelled) {
        remember(path, result);
        setDataUri(result);
      }
    };

    load().catch(reason => {
      if (cancelled) return;
      const message = reason instanceof Error ? reason.message : '사진을 불러오지 못했습니다.';
      console.warn('[AuthenticatedImage] load failed:', message, path);
      setError(message);
    });

    return () => {
      cancelled = true;
    };
  }, [path, protectedPath]);

  if (!path) return null;

  if (!protectedPath) {
    return <Image source={imageSource(path)} style={style} {...imageProps} />;
  }

  if (error) {
    return (
      <View style={[style, styles.state]}>
        <Text style={styles.errorText}>사진을 불러오지 못했습니다.</Text>
      </View>
    );
  }

  if (!dataUri) {
    return (
      <View style={[style, styles.state]}>
        <ActivityIndicator color="#8A857F" />
      </View>
    );
  }

  return <Image source={{ uri: dataUri }} style={style} {...imageProps} />;
};

const styles = StyleSheet.create({
  state: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFEAE3',
  },
  errorText: {
    color: '#8A857F',
    fontSize: 13,
  },
});

export default AuthenticatedImage;
