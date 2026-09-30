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

  it('coloca los nueve documentos únicos de QU428 en Otros', () => {
    const materials = getBundledMaterialsForCourse('QU428');
    const otherMaterials = materials.filter(material => material.materialType === 'other');

    expect(otherMaterials).toHaveLength(9);
    expect(otherMaterials.filter(material => material.fileType === 'PDF')).toHaveLength(4);
    expect(otherMaterials.filter(material => material.fileType === 'DOCX')).toHaveLength(2);
    expect(otherMaterials.filter(material => material.fileType === 'XLSX')).toHaveLength(3);
    expect(otherMaterials.filter(material => material.fileType !== 'XLSX').every(material => material.title.endsWith('- TEODARDO'))).toBe(true);
    expect(new Set(otherMaterials.map(material => material.fileUrl)).size).toBe(9);
  });

  it('coloca las 24 fotos de QU428 como el archivo de clases 2026-1', () => {
    const materials = getBundledMaterialsForCourse('QU428');
    const classMaterial = materials.find(material => material.materialType === 'classes');

    expect(classMaterial).toMatchObject({
      title: '2026-1',
      fileType: 'ZIP',
      contents: '24 fotografías JPEG',
      fileUrl: '/materiales/qu428-clases-2026-1.zip',
    });
  });
});
