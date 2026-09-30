import { describe, expect, it } from 'vitest';
import { getBundledMaterialsForCourse } from '@/lib/bundledCourseMaterials';

describe('materiales incluidos con la aplicación', () => {
  it('coloca los seis documentos de PI524 en Otros', () => {
    const materials = getBundledMaterialsForCourse('PI524');

    expect(materials).toHaveLength(6);
    expect(materials.every(material => material.materialType === 'other')).toBe(true);
    expect(materials.every(material => material.mimeType === 'application/pdf')).toBe(true);
    expect(new Set(materials.map(material => material.fileUrl)).size).toBe(6);
  });

  it('coloca los cuatro documentos de QU428 en Otros', () => {
    const materials = getBundledMaterialsForCourse('QU428');

    expect(materials).toHaveLength(4);
    expect(materials.every(material => material.materialType === 'other')).toBe(true);
    expect(materials.filter(material => material.fileType === 'PDF')).toHaveLength(2);
    expect(materials.filter(material => material.fileType === 'DOCX')).toHaveLength(2);
    expect(materials.every(material => material.title.endsWith('- TEODARDO'))).toBe(true);
    expect(materials.every(material => material.fileName.includes('-TEODARDO.'))).toBe(true);
    expect(new Set(materials.map(material => material.fileUrl)).size).toBe(4);
  });
});
