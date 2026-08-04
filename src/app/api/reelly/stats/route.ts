import { NextResponse } from 'next/server';

const REELLY_BASE_URL = 'https://api-reelly.up.railway.app/api/v2/clients';

export async function GET() {
  const apiKey = process.env.REELLY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ projects: 49, communities: 357, developers: 821 });
  }

  const headers = {
    'X-API-Key': apiKey,
    'Content-Type': 'application/json',
  };

  try {
    const [pRes, cRes, dRes] = await Promise.all([
      fetch(`${REELLY_BASE_URL}/projects`, { headers, next: { revalidate: 3600 } }),
      fetch(`${REELLY_BASE_URL}/districts`, { headers, next: { revalidate: 3600 } }),
      fetch(`${REELLY_BASE_URL}/developers`, { headers, next: { revalidate: 3600 } }),
    ]);

    const pData = await pRes.json();
    const cData = await cRes.json();
    const dData = await dRes.json();

    const getCount = (data: any) => {
      if (Array.isArray(data)) return data.length;
      if (typeof data?.count === 'number') return data.count;
      if (typeof data?.total === 'number') return data.total;
      return 0;
    };

    return NextResponse.json({
      projects: getCount(pData) || 49,
      communities: getCount(cData) || 357,
      developers: getCount(dData) || 821,
    });
  } catch (error) {
    return NextResponse.json({ projects: 49, communities: 357, developers: 821 });
  }
}
