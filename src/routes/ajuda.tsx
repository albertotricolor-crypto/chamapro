import { Link, createFileRoute } from "@tanstack/react-router";
import { LifeBuoy, ShieldAlert } from "lucide-react";
import { Footer, Header, Page } from "@/components/layout";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/ajuda")({
  head: () => ({
    meta: [{ title: "Ajuda — ChamaPro" }],
  }),
  component: Ajuda,
});

const FAQ = [
  {
    question: "Como funciona o ChamaPro?",
    answer:
      "Você busca um profissional por categoria ou bairro, pede um orçamento descrevendo o problema e informando o endereço e a data preferida. O profissional envia o orçamento com o valor e, se você aceitar, paga pela plataforma. O valor fica retido até você confirmar que o serviço foi concluído. Depois disso, o valor é liberado ao profissional e você pode avaliar o serviço.",
  },
  {
    question: "O que é o pagamento retido?",
    answer:
      "Quando você paga, o valor não vai direto para o profissional: ele fica retido pela plataforma até a conclusão do serviço. Só depois que você confirma a conclusão o valor é liberado ao profissional. Isso protege os dois lados: o profissional tem a garantia de que o pagamento foi feito, e você tem a garantia de que só libera o valor quando o serviço estiver pronto.",
  },
  {
    question: "Posso cancelar uma solicitação?",
    answer:
      "Sim. Você pode cancelar enquanto a solicitação estiver enviada, orçada ou aceita — antes do pagamento. Depois do pagamento, o cancelamento depende da etapa: se o serviço ainda não começou, fale com o profissional pelo chat da solicitação ou abra uma disputa para análise da equipe ChamaPro. O motivo do cancelamento é registrado.",
  },
  {
    question: "Como funciona o reembolso?",
    answer:
      "Se o serviço não for executado ou houver um problema grave, você pode abrir uma disputa na solicitação. A equipe ChamaPro analisa o caso e pode decidir pelo reembolso total, parcial ou pela liberação do valor ao profissional. Enquanto a disputa está aberta, o valor permanece retido.",
  },
  {
    question: "Como avalio um profissional?",
    answer:
      "Depois que o serviço é concluído e você confirma a conclusão, aparece o botão Avaliar na solicitação. Você dá de 1 a 5 estrelas, pode marcar destaques como pontualidade e qualidade e escrever um comentário. A avaliação é pública e ajuda outros clientes a escolher.",
  },
  {
    question: "Preciso criar uma conta?",
    answer:
      "Sim. Para pedir orçamentos, pagar e acompanhar solicitações você precisa de uma conta com nome, e-mail e telefone. O cadastro é gratuito. Se você é profissional, pode criar um perfil de profissional e oferecer seus serviços depois da aprovação dos documentos.",
  },
  {
    question: "Quais serviços estão disponíveis?",
    answer:
      "No lançamento, o ChamaPro atende Teresina (PI) com eletricista, encanador, pintor, montador de móveis, diarista/faxina e jardineiro. Novas categorias e cidades chegam conforme a rede de profissionais cresce.",
  },
  {
    question: "O que faço se o profissional não aparecer?",
    answer:
      "Fale com ele pelo chat da solicitação para confirmar o horário. Se não houver resposta, você pode cancelar (antes do pagamento) ou abrir uma disputa (depois do pagamento) para que a equipe ChamaPro analise o caso e, se for o caso, devolva o valor.",
  },
] as const;

function Ajuda() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <Page className="max-w-3xl flex-1 py-6">
        <h1 className="text-2xl font-bold text-foreground">Ajuda</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Perguntas frequentes sobre como pedir, pagar e acompanhar um serviço no ChamaPro.
        </p>

        <Card className="mt-6">
          <CardContent className="pt-6">
            <Accordion type="single" collapsible className="w-full">
              {FAQ.map((item, index) => (
                <AccordionItem key={item.question} value={`item-${index}`}>
                  <AccordionTrigger>{item.question}</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground">{item.answer}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LifeBuoy className="h-5 w-5" /> Precisa de ajuda com uma solicitação?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Acesse Minhas solicitações para acompanhar o andamento, falar com o profissional pelo chat ou verificar
              pagamentos e avaliações.
            </p>
            <Button asChild className="mt-4">
              <Link to="/solicitacoes">Acessar Minhas solicitações</Link>
            </Button>
          </CardContent>
        </Card>

        <p className="mt-4 flex items-start gap-2 rounded-md bg-warning-bg px-3 py-2 text-sm text-warning">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          Segurança: combine tudo pelo chat da plataforma e nunca pague fora do ChamaPro. A plataforma não se
          responsabiliza por pagamentos feitos por fora, e o valor retido só existe quando o pagamento é feito aqui.
        </p>
      </Page>
      <Footer />
    </div>
  );
}
