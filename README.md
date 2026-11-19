# Revisa

Controle de manutenção do carro: digita a placa, confirma o modelo e o app monta o plano de revisão (por km **e** por tempo, o que vier primeiro), acompanha a quilometragem e avisa quando cada item está chegando.

Next.js 15 + Neon (Postgres) + Tailwind 4. Código aberto sob licença [MIT](LICENSE).

## O que faz

- **Cadastro pela placa**: puxa marca, modelo, versão, ano, combustível e FIPE ([consultadeplaca.net](https://consultadeplaca.net/desenvolvedores), cada placa é paga uma vez só e fica em cache). Se a placa bater com mais de uma versão, você escolhe. Sem placa: busca na Tabela FIPE ou preenche à mão.
- **Plano de manutenção**: começa com um plano genérico e, com um toque, a IA (Gemini) gera o plano do seu modelo. Com o **PDF do manual**, o texto é lido no próprio celular, só as páginas de revisão vão para a IA, e ela usa os intervalos oficiais. Dá para editar, adicionar e remover itens.
- **Quilometragem**: você anota a km do painel; o app calcula a média de km/dia, estima a km de hoje e prevê a data de cada troca.
- **Serviços**: registro do que foi feito (data, km, valor, oficina, observação) e quanto já gastou no ano.
- **Painel**: cada item como *vencido*, *chegando*, *em dia* ou *sem registro*, com quanto falta em km e em dias.
- **Lembretes** (app Android): lembrete semanal para atualizar a km (dia e hora à escolha) e aviso uma semana antes e no dia previsto de cada manutenção. São notificações locais, agendadas no próprio celular. No navegador, o aviso aparece na tela inicial.
- **Vários carros** por conta.

## Rodando

### 1. Banco (Neon)

1. Crie um projeto em [neon.tech](https://neon.tech) (região São Paulo, `sa-east-1`).
2. Copie a connection string **pooled** para `DATABASE_URL`.
3. Crie as tabelas: `npm run db:migrate` (ou cole `db/schema.sql` no SQL Editor do Neon).

### 2. Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha. Na Vercel, cadastre as mesmas em *Project → Settings → Environment Variables*.

| Variável | Para quê |
|---|---|
| `DATABASE_URL` | Neon |
| `AUTH_SECRET` | assina o cookie de sessão (`openssl rand -base64 32`) |
| `ALLOW_SIGNUP` | `true` libera novos cadastros; vazio = só o primeiro usuário se cadastra |
| `CONSULTA_PLACA_KEY` | consulta de placa e busca FIPE. Chave `cdp_test_...` aceita as placas `TST0001`, `TST0002`, `TST0003` |
| `GEMINI_API_KEY` | gera o plano com IA ([aistudio.google.com/apikey](https://aistudio.google.com/apikey), tem cota grátis) |
| `GEMINI_MODEL` | opcional, padrão `gemini-2.5-flash` |

Sem `CONSULTA_PLACA_KEY` o cadastro é manual; sem `GEMINI_API_KEY` fica o plano genérico (editável).

### 3. Local

```bash
npm install
npm run db:migrate
npm run dev     # http://localhost:3000
```

### 4. Vercel

Importe o repositório (framework Next.js, sem configuração extra) e cadastre as variáveis.

## App Android

A ideia é a mesma do Forja: um projeto Capacitor separado (`Revisa_APP`) que abre este site e adiciona o plugin `@capacitor/local-notifications`. O código daqui já detecta quando está dentro do app (`lib/native.ts`) e agenda os lembretes no celular.

Ícone pequeno da notificação esperado no app: `ic_stat_revisa`.

## Estrutura

```
app/(app)/            telas logadas: início, km, serviços, plano, carro, ajustes
app/(app)/actions.ts  server actions (tudo checa se o carro é do usuário)
app/api/lembretes     dados para o celular agendar as notificações
app/login             entrar / criar conta
lib/maintenance.ts    média de km, km estimada, situação de cada item (puro)
lib/placa.ts          consulta de placa + busca FIPE
lib/ai.ts             geração do plano (Gemini)
lib/pdfText.ts        leitura do PDF do manual no navegador (pdf.js)
lib/native.ts         notificações locais (Capacitor)
db/schema.sql         tabelas
```

## Aviso

O plano gerado por IA é uma referência e pode errar. Na dúvida, valem o manual do proprietário e a concessionária.
