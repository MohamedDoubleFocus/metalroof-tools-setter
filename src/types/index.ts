export interface ColorDefinition {
  name: string;
  frenchName: string;
  ral: string;
  hex: string;
  description?: string;
}

export type RoofStyle = "wave_tile" | "standing_seam";

export type TaskType = "enhancement" | "roof";

export interface GenerationTask {
  taskType: TaskType;
  colorKey: string;
  roofStyle: RoofStyle;
  status: "pending" | "creating" | "polling" | "success" | "error";
  taskId?: string;
  resultUrl?: string;
  error?: string;
}

export interface GenerationProgressEvent {
  type: "progress" | "complete" | "error";
  taskIndex: number;
  taskType: TaskType;
  colorKey: string;
  roofStyle: RoofStyle;
  status: string;
  resultUrl?: string;
  error?: string;
}

export type InputMode = "address" | "upload";

export type AppStep =
  | "input_mode"
  | "address"
  | "upload"
  | "select_colors"
  | "generating"
  | "results";

export interface AppState {
  step: AppStep;
  inputMode: InputMode | null;
  uploadedFile: File | null;
  uploadedImageUrl: string | null;
  uploadedImagePreview: string | null;
  enhancedImageUrl: string | null;
  address: string | null;
  clientName: string;
  customInstructions: string;
  selectedColors: string[];
  selectedStyles: RoofStyle[];
  tasks: GenerationTask[];
  pdfLoading: boolean;
  uploadLoading: boolean;
  error: string | null;
}

export type AppAction =
  | { type: "SET_INPUT_MODE"; mode: InputMode }
  | { type: "SET_FILE"; file: File; preview: string }
  | { type: "SET_UPLOADED_URL"; url: string; preview?: string }
  | { type: "SET_UPLOAD_LOADING"; loading: boolean }
  | { type: "SET_ADDRESS"; address: string }
  | { type: "SET_CLIENT_NAME"; name: string }
  | { type: "SET_CUSTOM_INSTRUCTIONS"; instructions: string }
  | { type: "TOGGLE_COLOR"; colorKey: string }
  | { type: "TOGGLE_STYLE"; style: RoofStyle }
  | { type: "START_GENERATION"; tasks: GenerationTask[] }
  | {
      type: "UPDATE_TASK";
      taskIndex: number;
      update: Partial<GenerationTask>;
    }
  | { type: "SET_ENHANCED_URL"; url: string }
  | { type: "GENERATION_COMPLETE" }
  | { type: "SET_PDF_LOADING"; loading: boolean }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "RESET" };
