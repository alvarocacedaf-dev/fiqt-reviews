import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CourseMaterialFolders, type CourseMaterialFile } from '@/components/CourseMaterialFolders';
import { formatFileType } from '@/lib/filePresentation';

describe('tipo visible de los materiales del curso', () => {
  it.each([
    ['documento.pdf', 'application/pdf', 'PDF'],
    ['documento.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'WORD'],
    ['datos.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'EXCEL'],
    ['diapositivas.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'POWERPOINT'],
    ['foto.jpeg', 'image/jpeg', 'IMAGEN'],
  ])('identifica %s como %s', (fileName, mimeType, expected) => {
    expect(formatFileType({ file_name: fileName, mime_type: mimeType })).toBe(expected);
  });

  it('muestra el formato inmediatamente después del peso', () => {
    const files: CourseMaterialFile[] = [
      {
        id: 'pdf',
        title: 'Celdas electrolíticas',
        material_type: 'other',
        academic_term: null,
        file_name: 'celdas.pdf',
        mime_type: 'application/pdf',
        file_size: 1_664_661,
        created_at: '',
        signed_url: '/celdas.pdf',
      },
      {
        id: 'word',
        title: 'Problemas binarios',
        material_type: 'other',
        academic_term: null,
        file_name: 'problemas.docx',
        mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        file_size: 42_750,
        created_at: '',
        signed_url: '/problemas.docx',
      },
    ];

    render(<CourseMaterialFolders files={files} />);

    expect(screen.getByText('1.6 MB · PDF')).toBeInTheDocument();
    expect(screen.getByText('42 KB · WORD')).toBeInTheDocument();
  });
});
