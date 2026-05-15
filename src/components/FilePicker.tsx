interface Props {
  onFileLoaded: (text: string) => void
}

export function FilePicker({ onFileLoaded }: Props) {
  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    onFileLoaded(text)
  }

  return (
    <div style={{
      position: 'absolute',
      top: 10,
      left: 10,
      zIndex: 10,
      background: 'rgba(0,0,0,0.6)',
      color: 'white',
      padding: '8px 12px',
      borderRadius: 6,
      fontFamily: 'system-ui',
    }}>
      <input type="file" accept=".gpx" onChange={handleChange} />
    </div>
  )
}
