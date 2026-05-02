import { NextResponse } from 'next/server';
const { AfipServices } = require('facturajs');
import path from 'path';
import fs from 'fs';

/**
 * API para facturación electrónica ARCA (AFIP) - MODO LOCAL 100% GRATIS
 * POST /api/facturar
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount } = body;

    if (!amount || isNaN(amount)) {
      return NextResponse.json({ error: 'Monto inválido' }, { status: 400 });
    }

    const certPath = path.join(process.cwd(), 'certs', '23354207184.crt');
    const keyPath = path.join(process.cwd(), 'certs', 'privada.key');
    const tokensPath = path.join(process.cwd(), 'certs', 'tokens.json');

    // Asegurar que existe la carpeta para tokens
    if (!fs.existsSync(path.dirname(tokensPath))) {
        fs.mkdirSync(path.dirname(tokensPath), { recursive: true });
    }

    const afip = new AfipServices({
      homo: false,
      CUIT: "23354207184",
      certPath: certPath,
      privateKeyPath: keyPath,
      cacheTokensPath: tokensPath,
      tokensExpireInHours: 12, // Duración de los tokens (12 horas)
      useLegacyTls: true 
    });

    const puntoDeVenta = 4;
    const tipoDeComprobante = 11; // Factura C

    console.log('--- Iniciando Facturación Local (facturajs) ---');

    // 1. Obtener el último comprobante
    const resLast = await afip.getLastBillNumber({
      Auth: { Cuit: "23354207184" },
      params: {
        PtoVta: puntoDeVenta,
        CbteTipo: tipoDeComprobante
      }
    });
    
    const lastNumber = resLast.CbteNro;
    const nextVoucher = lastNumber + 1;
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');

    // 2. Crear la factura
    const data = {
      Auth: { Cuit: 23354207184 },
      params: {
        FeCAEReq: {
          FeCabReq: {
            CantReg: 1,
            PtoVta: puntoDeVenta,
            CbteTipo: tipoDeComprobante
          },
          FeDetReq: {
            FECAEDetRequest: {
              Concepto: 1, // Productos
              DocTipo: 99,  // Consumidor Final
              DocNro: 0,
              CbteDesde: nextVoucher,
              CbteHasta: nextVoucher,
              CbteFch: date,
              ImpTotal: amount,
              ImpTotConc: 0,
              ImpNeto: amount,
              ImpOpEx: 0,
              ImpTrib: 0,
              ImpIVA: 0,
              MonId: 'PES',
              MonCotiz: 1
            }
          }
        }
      }
    };

    const res = await afip.createBill(data);

    if (res.FeCabResp.Resultado !== 'A') {
        const obs = res.FeDetResp.FECAEDetResponse[0].Observaciones;
        throw new Error(`Resultado AFIP: ${res.FeCabResp.Resultado}. Obs: ${JSON.stringify(obs)}`);
    }

    return NextResponse.json({
      cae: res.FeDetResp.FECAEDetResponse[0].CAE,
      expiration: res.FeDetResp.FECAEDetResponse[0].CAEFchVto,
      voucher_number: nextVoucher
    });

  } catch (error: any) {
    console.error('--- ERROR FACTURAJS ---', error);
    return NextResponse.json({ 
      error: 'Error al procesar la factura local', 
      details: error.message 
    }, { status: 500 });
  }
}
