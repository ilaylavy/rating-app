import { useEffect, useMemo } from 'react'

/** Object URL for a blob, revoked automatically on change/unmount. */
export function useBlobUrl(blob: Blob | undefined): string | undefined {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : undefined), [blob])
  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [url])
  return url
}
