export type DiagramType = 'mermaid_flowchart' | 'mermaid_sequence' | 'mermaid_class' | 'mermaid_architecture' | 'plantuml' | 'svg_diagram';

export interface DiagramGenerationOptions {
  type: DiagramType;
  title?: string;
  theme?: 'neutral' | 'dark' | 'forest' | 'primary';
  direction?: 'TB' | 'LR' | 'RL' | 'BT';
}

export interface DiagramGenerationResult {
  diagramId: string;
  type: DiagramType;
  title: string;
  rawCode: string;
  isValidSyntax: boolean;
  sanitizedCode: string;
  renderHints: {
    containerWidth: string;
    aspectRatio: string;
    suggestedFormat: 'mermaid' | 'svg' | 'plantuml';
  };
}
