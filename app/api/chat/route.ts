import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No se recibió archivo de audio" },
        { status: 400 },
      );
    }

    // Aquí debes implementar la lógica para enviar el audio a tu backend
    // y recibir la respuesta de audio

    // EJEMPLO: Enviar a tu endpoint backend
    const backendFormData = new FormData();
    backendFormData.append("audio_file", audioFile);
    backendFormData.append("client_id", "1234");

    // Reemplaza con tu endpoint real
    const backendResponse = await fetch(
      "https://api.gisee.lat/api/esp32/interact",
      {
        method: "POST",
        body: backendFormData,
      },
    );

    console.log("Respuesta del backend recibida: " + backendResponse.status);
    if (!backendResponse.ok) {
      throw new Error("Error en la respuesta del backend");
    }

    // Devolver el audio de respuesta
    const responseAudio = await backendResponse.blob();

    return new NextResponse(responseAudio, {
      headers: {
        "Content-Type": "audio/webm",
      },
    });
  } catch (error) {
    console.error("Error procesando audio:", error);
    return NextResponse.json(
      { error: "Error al procesar el audio" },
      { status: 500 },
    );
  }
}
