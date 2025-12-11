"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Mic, Square, Play, Pause, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type Message = {
  id: string
  type: "user" | "assistant"
  audioUrl: string
  isPlaying?: boolean
  duration?: number
}

export default function AudioChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [playingId, setPlayingId] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map())
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
      }
      audioRefs.current.forEach((audio) => {
        audio.pause()
        audio.src = ""
      })
    }
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        stream.getTracks().forEach((track) => track.stop())
        await sendAudio(audioBlob)
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (error) {
      console.error("Error al acceder al micrófono:", error)
      alert("No se pudo acceder al micrófono. Por favor, verifica los permisos.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
      }
    }
  }

  const sendAudio = async (audioBlob: Blob) => {
    setIsProcessing(true)

    const userAudioUrl = URL.createObjectURL(audioBlob)
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: "user",
      audioUrl: userAudioUrl,
    }

    setMessages((prev) => [...prev, userMessage])

    try {
      // Aquí debes reemplazar con tu endpoint real
      const formData = new FormData()
      formData.append("audio", audioBlob, "recording.webm")

      const response = await fetch("/api/chat", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Error en la respuesta del servidor")
      }

      const responseBlob = await response.blob()
      const responseAudioUrl = URL.createObjectURL(responseBlob)

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        type: "assistant",
        audioUrl: responseAudioUrl,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error("Error al enviar el audio:", error)
      alert("Error al procesar el audio. Por favor, intenta nuevamente.")
    } finally {
      setIsProcessing(false)
    }
  }

  const togglePlay = (id: string, audioUrl: string) => {
    const audio = audioRefs.current.get(id) || new Audio(audioUrl)

    if (!audioRefs.current.has(id)) {
      audioRefs.current.set(id, audio)
      audio.onended = () => {
        setPlayingId(null)
      }
    }

    if (playingId === id) {
      audio.pause()
      setPlayingId(null)
    } else {
      audioRefs.current.forEach((a, otherId) => {
        if (otherId !== id) {
          a.pause()
        }
      })
      audio.play()
      setPlayingId(id)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden">
        {/* Header */}
        <div className="border-b border-border bg-muted/30 px-6 py-4">
          <h1 className="text-xl font-semibold text-foreground text-balance">Chat de Voz</h1>
          <p className="text-sm text-muted-foreground mt-1">Graba tu mensaje y recibe respuestas en audio</p>
        </div>

        {/* Messages Area */}
        <div className="h-[400px] md:h-[500px] overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Mic className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-balance">Presiona el botón de grabar para comenzar</p>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={cn("flex gap-3 items-start", message.type === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-2xl max-w-[80%] shadow-sm",
                  message.type === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                <Button
                  size="icon"
                  variant="ghost"
                  className={cn(
                    "h-10 w-10 rounded-full shrink-0",
                    message.type === "user"
                      ? "hover:bg-primary-foreground/10 text-primary-foreground"
                      : "hover:bg-background/50",
                  )}
                  onClick={() => togglePlay(message.id, message.audioUrl)}
                >
                  {playingId === message.id ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex gap-1">
                    {[...Array(20)].map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-1 rounded-full transition-all",
                          message.type === "user" ? "bg-primary-foreground/40" : "bg-foreground/40",
                        )}
                        style={{
                          height: `${Math.random() * 16 + 8}px`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {isProcessing && (
            <div className="flex justify-start">
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-muted shadow-sm">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Procesando...</span>
              </div>
            </div>
          )}
        </div>

        {/* Recording Controls */}
        <div className="border-t border-border bg-muted/30 px-6 py-6">
          <div className="flex flex-col items-center gap-4">
            {isRecording && (
              <div className="text-sm text-muted-foreground font-mono">Grabando: {formatTime(recordingTime)}</div>
            )}

            <Button
              size="lg"
              className={cn(
                "h-16 w-16 rounded-full shadow-lg transition-all",
                isRecording
                  ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground",
              )}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
            >
              {isRecording ? <Square className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              {isRecording ? "Presiona para detener la grabación" : "Presiona para comenzar a grabar"}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
