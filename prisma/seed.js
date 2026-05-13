import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3000";

const data = [
  {
    name: "Fr4gmento 01",
    slug: "fragmento-01",
    description:
      "FRAGMENTO 01 nace del concepto de ruptura dentro del sistema. Una base negra limpia intervenida por fragmentos azules que irrumpen como código alterado. No siguen reglas. No buscan simetría. No piden permiso. Diseñada para quienes entienden que lo diferente no se corrige, se potencia.",
    fitGuide: "Calce relajado y versátil para uso diario.",
    categories: ["shorts"],
    variants: [
      { sku: "M4-FRAG-01-M",   size: "M",   price: 48000, stock: 5 },
      { sku: "M4-FRAG-01-L",   size: "L",   price: 48000, stock: 5 },
      { sku: "M4-FRAG-01-XXL", size: "XXL", price: 48000, stock: 3 },
    ],
    images: [
      { url: `${BASE_URL}/images/products/fragmento01/fragmento01.jpeg`,         isPrimary: true,  order: 0 },
      { url: `${BASE_URL}/images/products/fragmento01/fragmento01-detalle.jpeg`, isPrimary: false, order: 1 },
      { url: `${BASE_URL}/images/products/fragmento01/fragmento02-trasero.jpeg`, isPrimary: false, order: 2 },
    ],
    features: [
      { text: "Base negra minimalista.",                          order: 0 },
      { text: "Intervenciones azules en pierna y bolsillo trasero.", order: 1 },
      { text: "Cintura elastizada con ajuste.",                   order: 2 },
      { text: "Silueta cómoda y versátil.",                       order: 3 },
    ],
    composition: [
      { label: "Exterior", value: "Gabardina liviana de tacto suave" },
      { label: "Calce",    value: "Relaxed fit de uso urbano" },
      { label: "Detalle",  value: "Intervenciones azules de alto contraste" },
    ],
    care: [
      { text: "Lavar con agua fría y colores similares.", order: 0 },
      { text: "No usar blanqueador.",                     order: 1 },
      { text: "Secar a la sombra.",                       order: 2 },
    ],
  },
  {
    name: "DU4LS",
    slug: "duals-m4rs",
    description:
      "PATCH es la línea permanente de reconfiguración de M4RS. Construida a partir de retazos de denim y telas limitadas, cada pieza nace de la unión de fragmentos distintos. Cada pieza es única. Cada combinación es irrepetible.",
    fitGuide: null,
    categories: ["accessories"],
    variants: [
      { sku: "M4-DUALS-01", size: null, price: 42000, stock: 1 },
    ],
    images: [
      { url: `${BASE_URL}/images/products/patch/patch1.jpg`, isPrimary: true,  order: 0 },
      { url: `${BASE_URL}/images/products/patch/patch2.jpg`, isPrimary: false, order: 1 },
      { url: `${BASE_URL}/images/products/patch/patch3.jpg`, isPrimary: false, order: 2 },
    ],
    features: [
      { text: "Construida a partir de retazos de denim y telas limitadas.", order: 0 },
      { text: "Cada combinación es irrepetible.",                           order: 1 },
      { text: "Etiqueta M4RS en un lado.",                                  order: 2 },
      { text: "Hebilla metálica y módulos de cinta en el otro.",            order: 3 },
    ],
    composition: [
      { label: "Exterior",  value: "Denim y textiles de edición limitada" },
      { label: "Formato",   value: "Mini bag de uso diario" },
      { label: "Herrajes",  value: "Hebilla metálica y módulos de cinta" },
    ],
    care: [
      { text: "Limpiar con paño húmedo.",             order: 0 },
      { text: "No lavar a máquina.",                  order: 1 },
      { text: "Guardar en lugar seco y ventilado.",   order: 2 },
    ],
  },
];

const categories = [
  { name: "Shorts",      slug: "shorts" },
  { name: "Accesorios",  slug: "accessories" },
];

async function main() {
  console.log("Seeding...");

  // Categorías
  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }

  // Productos
  for (const product of data) {
    const { categories: cats, variants, images, features, composition, care, ...productData } = product;

    await prisma.product.upsert({
      where: { slug: productData.slug },
      update: {},
      create: {
        ...productData,
        variants:    { create: variants },
        images:      { create: images },
        features:    { create: features },
        composition: { create: composition },
        care:        { create: care },
        categories: {
          create: cats.map((slug) => ({
            category: { connect: { slug } },
          })),
        },
      },
    });

    console.log(`  ✓ ${productData.name}`);
  }

  console.log("Seed completo.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
