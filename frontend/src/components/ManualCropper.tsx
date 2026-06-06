import { useRef, useState, type PointerEvent } from 'react'

type CropBox = {
  x: number
  y: number
  width: number
  height: number
}

type DragMode =
  | 'move'
  | 'n'
  | 'ne'
  | 'e'
  | 'se'
  | 's'
  | 'sw'
  | 'w'
  | 'nw'

type ManualCropperProps = {
  imageUrl: string
  onApplyCrop: (file: File, previewUrl: string) => void
  onError: (message: string) => void
}

const initialCropBox: CropBox = {
  x: 18,
  y: 14,
  width: 64,
  height: 70,
}

export function ManualCropper({
  imageUrl,
  onApplyCrop,
  onError,
}: ManualCropperProps) {
  const imageRef = useRef<HTMLImageElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const [cropBox, setCropBox] = useState<CropBox>(initialCropBox)
  const [dragMode, setDragMode] = useState<DragMode | null>(null)

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragMode || !stageRef.current) {
      return
    }

    const rect = stageRef.current.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100

    setCropBox((current) => {
      if (dragMode === 'move') {
        const nextX = Math.min(100 - current.width, Math.max(0, x - current.width / 2))
        const nextY = Math.min(100 - current.height, Math.max(0, y - current.height / 2))
        return { ...current, x: nextX, y: nextY }
      }

      return resizeCropBox(current, dragMode, x, y)
    })
  }

  const applyCrop = () => {
    const image = imageRef.current
    if (!image || !image.naturalWidth || !image.naturalHeight) {
      onError('크롭할 이미지를 아직 읽지 못했습니다.')
      return
    }

    const sourceX = Math.round((cropBox.x / 100) * image.naturalWidth)
    const sourceY = Math.round((cropBox.y / 100) * image.naturalHeight)
    const sourceWidth = Math.round((cropBox.width / 100) * image.naturalWidth)
    const sourceHeight = Math.round((cropBox.height / 100) * image.naturalHeight)

    const canvas = document.createElement('canvas')
    canvas.width = sourceWidth
    canvas.height = sourceHeight

    const context = canvas.getContext('2d')
    if (!context) {
      onError('크롭 캔버스를 만들지 못했습니다.')
      return
    }

    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      sourceWidth,
      sourceHeight,
    )

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          onError('크롭 이미지를 만들지 못했습니다.')
          return
        }

        const file = new File([blob], `manual-crop-${Date.now()}.jpg`, {
          type: 'image/jpeg',
        })
        onApplyCrop(file, URL.createObjectURL(blob))
      },
      'image/jpeg',
      0.94,
    )
  }

  return (
    <div className="manual-cropper">
      <div
        className="crop-stage"
        ref={stageRef}
        onPointerMove={handlePointerMove}
        onPointerUp={() => setDragMode(null)}
        onPointerLeave={() => setDragMode(null)}
      >
        <img ref={imageRef} src={imageUrl} alt="수동 크롭 원본" />
        <div
          className="crop-selection"
          style={{
            left: `${cropBox.x}%`,
            top: `${cropBox.y}%`,
            width: `${cropBox.width}%`,
            height: `${cropBox.height}%`,
          }}
          onPointerMove={handlePointerMove}
          onPointerUp={() => setDragMode(null)}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId)
            setDragMode('move')
          }}
        >
          <span>Manual crop</span>
          {(['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as DragMode[]).map(
            (handle) => (
              <button
                className={`crop-handle crop-handle-${handle}`}
                key={handle}
                type="button"
                aria-label={`크롭 영역 ${handle} 방향 조절`}
                onPointerDown={(event) => {
                  event.stopPropagation()
                  event.currentTarget.setPointerCapture(event.pointerId)
                  setDragMode(handle)
                }}
              />
            ),
          )}
        </div>
      </div>

      <button className="secondary-button crop-apply-button" type="button" onClick={applyCrop}>
        선택 영역 적용
      </button>
    </div>
  )
}

function resizeCropBox(
  current: CropBox,
  mode: DragMode,
  pointerX: number,
  pointerY: number,
) {
  const minSize = 12
  let left = current.x
  let top = current.y
  let right = current.x + current.width
  let bottom = current.y + current.height

  if (mode.includes('w')) {
    left = Math.min(right - minSize, Math.max(0, pointerX))
  }
  if (mode.includes('e')) {
    right = Math.max(left + minSize, Math.min(100, pointerX))
  }
  if (mode.includes('n')) {
    top = Math.min(bottom - minSize, Math.max(0, pointerY))
  }
  if (mode.includes('s')) {
    bottom = Math.max(top + minSize, Math.min(100, pointerY))
  }

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  }
}
