export type BlockType = "text" | "image" | "link" | "sticky" | "frame";

export type BlockShape = "rect" | "oval" | "diamond" | "parallelogram";

export type ConnectionStyle = "arrow" | "bidirectional" | "blocker";

export type Tool = "select" | "connect";

export interface Position {
  x: number;
  y: number;
}

export interface Camera extends Position {
  zoom: number;
}

export interface Block {
  id: string;
  type: BlockType;
  position: Position;
  width: number;
  height: number;
  title: string;
  content: string;
  zIndex: number;
  color?: string;
  embed?: boolean;
  shape?: BlockShape;
  linkUrl?: string;
}

export interface Connection {
  id: string;
  fromId: string;
  toId: string;
  label: string;
  style?: ConnectionStyle;
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  blocks: Block[];
  connections: Connection[];
  camera: Camera;
}
