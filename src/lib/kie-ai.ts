const API_KEY = process.env.KIE_AI_API_KEY!;

export async function uploadImage(
  fileBuffer: Buffer,
  fileName: string
): Promise<string> {
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(fileBuffer)]);
  formData.append("file", blob, fileName);
  formData.append("uploadPath", "images");

  const res = await fetch(
    "https://kieai.redpandaai.co/api/file-stream-upload",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
      body: formData,
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed (${res.status}): ${text}`);
  }

  const json = await res.json();
  console.log("Upload response:", JSON.stringify(json, null, 2));

  // Try multiple possible response paths
  const fileUrl =
    json.data?.fileUrl ||
    json.data?.downloadUrl ||
    json.data?.url ||
    json.fileUrl ||
    json.downloadUrl ||
    json.url;
  if (!fileUrl) {
    throw new Error(
      "No file URL returned from upload. Response: " +
        JSON.stringify(json).slice(0, 500)
    );
  }
  return fileUrl;
}

export async function createTask(
  prompt: string,
  imageUrl: string
): Promise<string> {
  const res = await fetch("https://api.kie.ai/api/v1/jobs/createTask", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "nano-banana-2",
      input: {
        prompt,
        image_input: [imageUrl],
        aspect_ratio: "auto",
        resolution: "2K",
        output_format: "jpg",
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Create task failed (${res.status}): ${text}`);
  }

  const json = await res.json();
  const taskId = json.data?.taskId;
  if (!taskId) {
    throw new Error(
      "No taskId returned: " + JSON.stringify(json).slice(0, 200)
    );
  }
  return taskId;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function pollTaskResult(
  taskId: string,
  timeoutMs = 180000
): Promise<string[]> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const res = await fetch(
      `https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
        },
      }
    );

    if (!res.ok) {
      throw new Error(`Poll failed (${res.status})`);
    }

    const json = await res.json();
    const state = json.data?.state;

    if (state === "success") {
      const resultJson = JSON.parse(json.data.resultJson);
      return resultJson.resultUrls || [];
    }

    if (state === "fail") {
      throw new Error(
        `Task failed: ${json.data?.failMsg || "Unknown error"}`
      );
    }

    await sleep(5000);
  }

  throw new Error("Task timed out after " + timeoutMs / 1000 + "s");
}
