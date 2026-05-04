import { NextResponse } from 'next/server';
// @ts-expect-error facturajs does not have types
import { AfipServices } from 'facturajs';
import path from 'path';
import fs from 'fs';

/**
 * API para facturación electrónica ARCA (AFIP) - MODO LOCAL 100% GRATIS
 * POST /api/facturar
 * Certs are read from env vars AFIP_CERT_B64 and AFIP_KEY_B64 (base64-encoded)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount } = body;

    if (!amount || isNaN(amount)) {
      return NextResponse.json({ error: 'Monto inválido' }, { status: 400 });
    }

    const fallbackCuitStr = process.env.AFIP_CUIT || "23354207184";
    const fallbackCuitNum = parseInt(fallbackCuitStr, 10);

    // Resolve cert paths: prefer /tmp (Vercel) written from env vars, fallback to local /certs dir
    const certB64 = process.env.AFIP_CERT_B64;
    const keyB64  = process.env.AFIP_KEY_B64;

    let certPath: string;
    let keyPath: string;

    if (certB64 && keyB64) {
      // Vercel / production: write to /tmp on each cold start
      certPath = '/tmp/afip.crt';
      keyPath  = '/tmp/afip.key';
      if (!fs.existsSync(certPath)) {
        fs.writeFileSync(certPath, Buffer.from(certB64, 'base64').toString('utf8'));
      }
      if (!fs.existsSync(keyPath)) {
        fs.writeFileSync(keyPath, Buffer.from(keyB64, 'base64').toString('utf8'));
      }
    } else {
      // Local dev: read from /certs directory
      certPath = path.join(process.cwd(), 'certs', `${fallbackCuitStr}.crt`);
      keyPath  = path.join(process.cwd(), 'certs', 'privada.key');
    }

    const tokensPath = '/tmp/afip_tokens.json';

    const afip = new AfipServices({
      homo: false,
      cuit: parseInt(fallbackCuitStr, 10), // Cuit in lower case or as integer based on types
      CUIT: fallbackCuitStr, // keep old string key in case of strange JS mapping, with ignore
      // @ts-expect-error fallback support
      certPath: certPath,
      privateKeyPath: keyPath,
      cacheTokensPath: tokensPath,
      tokensExpireInHours: 12,
      useLegacyTls: true
    } as any);

    const puntoDeVenta = 4;
    const tipoDeComprobante = 11; // Factura C

    console.log('--- Iniciando Facturación Local (facturajs) ---');

    // 1. Obtener el último comprobante
    const resLast = await afip.getLastBillNumber({
      Auth: { Cuit: fallbackCuitNum },
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
      Auth: { Cuit: fallbackCuitNum },
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
              MonId: 'PES' as const,
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
