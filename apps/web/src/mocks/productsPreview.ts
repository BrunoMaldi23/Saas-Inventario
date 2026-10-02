/*
 * MOCK VISUAL — eliminar cuando exista GET de productos (Fase 3).
 * Solo sirve para visualizar densidad de la tabla y su versión móvil.
 * No contiene stock, precios ni cálculos.
 */
export type ProductPreview = {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  active: boolean;
};

export const productsPreview: ProductPreview[] = [
  {
    id: 'p1',
    sku: 'BEB-0001',
    name: 'Agua mineral sin gas 1,5 L',
    category: 'Bebidas',
    unit: 'Unidad',
    active: true,
  },
  {
    id: 'p2',
    sku: 'FAR-0142',
    name: 'Paracetamol 500 mg x 16 comprimidos',
    category: 'Farmacia',
    unit: 'Caja',
    active: true,
  },
  {
    id: 'p3',
    sku: 'FER-2210',
    name: 'Tornillo autoperforante 8 x 1" (caja 100)',
    category: 'Ferretería',
    unit: 'Caja',
    active: true,
  },
  {
    id: 'p4',
    sku: 'ABA-0310',
    name: 'Arroz grado 1, 1 kg',
    category: 'Abarrotes',
    unit: 'Unidad',
    active: true,
  },
  {
    id: 'p5',
    sku: 'LIM-0057',
    name: 'Detergente líquido 3 L',
    category: 'Limpieza',
    unit: 'Unidad',
    active: false,
  },
];
