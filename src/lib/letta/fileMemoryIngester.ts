import { LettaStore } from './LettaStore';

export interface IngestedFileMetadata {
  fileName: string;
  fileType: string;
  fileSize: number;
  totalChunks: number;
  tags: string[];
  summarySnippet: string;
}

export class FileMemoryIngester {
  /**
   * Split text content into discrete, overlapping passages for Archival Memory.
   */
  public static chunkText(
    text: string,
    chunkSize = 800,
    chunkOverlap = 150
  ): string[] {
    const clean = text.trim();
    if (!clean) return [];
    if (clean.length <= chunkSize) return [clean];

    const chunks: string[] = [];
    let start = 0;

    while (start < clean.length) {
      let end = start + chunkSize;
      if (end < clean.length) {
        // Find natural paragraph or sentence boundary
        const nextBreak = clean.indexOf('\n\n', end - 100);
        if (nextBreak !== -1 && nextBreak <= end + 100) {
          end = nextBreak;
        } else {
          const nextSentence = clean.indexOf('. ', end - 60);
          if (nextSentence !== -1 && nextSentence <= end + 60) {
            end = nextSentence + 1;
          }
        }
      }

      const chunk = clean.slice(start, end).trim();
      if (chunk.length > 20) {
        chunks.push(chunk);
      }

      start = end - chunkOverlap;
      if (start >= clean.length - chunkOverlap) break;
    }

    return chunks;
  }

  /**
   * Ingest an uploaded file/document into the Letta Archival Memory.
   */
  public static async ingestDocument(
    agentId: string,
    fileName: string,
    fileContent: string,
    fileType: string,
    conversationId?: string
  ): Promise<IngestedFileMetadata> {
    const chunks = this.chunkText(fileContent);
    const tags = [
      'document',
      fileType.toLowerCase().replace(/[^a-z0-9]/g, ''),
      fileName.split('.')[0].toLowerCase().slice(0, 15),
    ].filter(Boolean);

    // Insert chunks as Archival Passages
    chunks.forEach((chunk, index) => {
      LettaStore.insertArchivalPassage(
        agentId,
        `[File: ${fileName} | Part ${index + 1}/${chunks.length}]\n${chunk}`,
        tags,
        {
          fileName,
          fileType,
          chunkIndex: index,
          totalChunks: chunks.length,
          conversationId,
          importance: 4,
        }
      );
    });

    const summarySnippet = fileContent.slice(0, 300).replace(/\s+/g, ' ').trim() + (fileContent.length > 300 ? '...' : '');

    // Record reference in Core Memory project_context
    LettaStore.appendCoreMemory(
      agentId,
      'project_context',
      `Uploaded file reference: "${fileName}" (${chunks.length} indexed archival passages, type: ${fileType})`
    );

    return {
      fileName,
      fileType,
      fileSize: fileContent.length,
      totalChunks: chunks.length,
      tags,
      summarySnippet,
    };
  }
}
