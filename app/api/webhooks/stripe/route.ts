import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { sendCureEmail } from '@/lib/mailer';
import { supabase } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2024-06-20' as any,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const url = session.metadata?.url;
    const email = session.customer_details?.email;

    console.log(`Pago completado para la URL: ${url}. Sesión ID: ${session.id}`);
    
    if (url) {
        // Save to Database
        const { error: dbError } = await supabase
            .from('purchases')
            .insert({
                url: url,
                stripe_session_id: session.id,
                email: email || null,
                status: 'completed',
                created_at: new Date().toISOString()
            });
            
        if (dbError) {
            console.error('Error guardando en Supabase:', dbError);
        } else {
            console.log('Compra registrada en Supabase correctamente.');
        }
    }

    if (email && url) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bleed.example.com';
      const edgeScriptLink = `${baseUrl}/edge-cure.js?id=${session.id}`;
      
      await sendCureEmail(email, url, edgeScriptLink);
      console.log(`Email de inyección Edge enviado a: ${email}`);
    }
  }

  return NextResponse.json({ received: true });
}
