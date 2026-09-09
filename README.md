# Palavras que Edificam

Aplicativo de devocional diário que pode ser instalado no celular. A palavra muda automaticamente todos os dias, funciona offline depois do primeiro acesso e pode enviar uma notificação diária por meio do OneSignal.

## O que já está pronto

- Devocional do dia com tema, frase, versículo, reflexão, oração e tarefa.
- 14 devocionais de exemplo em rotação.
- Botão para compartilhar.
- Instalação como aplicativo no Android e no iPhone.
- Funcionamento offline.
- Publicação automática pelo GitHub Pages.
- Envio automático de uma notificação pela manhã.

## 1. Coloque os arquivos no GitHub

1. Descompacte o arquivo que recebeu.
2. Abra o seu repositório no GitHub.
3. Clique em **Add file** e depois em **Upload files**.
4. Envie todas as pastas e arquivos, mantendo a mesma organização.
5. Clique em **Commit changes**.

Se o repositório ainda não foi criado, um bom nome é:

```
palavras-que-edificam-app
```

## 2. Publique o aplicativo

1. No repositório, abra **Settings**.
2. No menu lateral, entre em **Pages**.
3. Em **Source**, escolha **GitHub Actions**.
4. Abra a aba **Actions** e aguarde a tarefa **Publicar aplicativo** ficar verde.

O endereço será parecido com:

```
https://SEU-USUARIO.github.io/palavras-que-edificam-app/
```

Exemplo para este projeto:

```
https://rosimereferreira.github.io/palavras-que-edificam-app/
```

## 3. Ligue as notificações

Crie uma conta no OneSignal e adicione um aplicativo do tipo Web:

1. Em **Settings > Push & In-App > Web**, escolha **Custom Code**.
2. Em **Site Name**, coloque **Palavras que Edificam**.
3. Em **Site URL**, coloque somente a origem do GitHub Pages, por exemplo:
   `https://rosimereferreira.github.io` — sem o nome do repositório no final.
4. Ative **Auto Resubscribe**.
5. Salve e copie o **App ID** em **Settings > Keys & IDs**.
6. Abra o arquivo `dist/config.js` no GitHub.
7. Troque `COLE_AQUI_O_APP_ID_DO_ONESIGNAL` pelo seu App ID.
8. Salve em **Commit changes**.

O arquivo deve ficar assim:

```js
window.APP_CONFIG = Object.freeze({
  oneSignalAppId: "SEU-APP-ID-AQUI",
  timeZone: "America/Campo_Grande"
});
```

O **App ID** pode ficar nesse arquivo. A **App API Key não pode**.

## 4. Guarde as chaves com segurança

No GitHub, abra:

**Settings > Secrets and variables > Actions > New repository secret**

Crie estes três segredos:

| Nome | Valor |
| --- | --- |
| `ONESIGNAL_APP_ID` | O App ID copiado do OneSignal |
| `ONESIGNAL_API_KEY` | A App API Key copiada do OneSignal |
| `SITE_URL` | O endereço completo do seu aplicativo, sem barra no final |

Nunca coloque a App API Key dentro de `config.js`, `app.js` ou qualquer arquivo público.

## 5. Faça o primeiro teste

1. Abra o endereço do aplicativo no celular.
2. Instale o aplicativo.
3. Abra-o pelo ícone criado na tela inicial.
4. Toque em **Receber mensagem diária** e permita as notificações.
5. No GitHub, abra **Actions > Enviar devocional diário**.
6. Clique em **Run workflow**.

Se tudo estiver certo, a notificação chegará ao aparelho inscrito.

### No iPhone

O iPhone exige esta ordem:

1. Abrir o site no Safari, Chrome ou Edge.
2. Tocar em **Compartilhar**.
3. Escolher **Adicionar à Tela de Início**.
4. Abrir pelo novo ícone.
5. Só então tocar em **Receber mensagem diária**.

## 6. Adicione novos devocionais

Edite o arquivo:

```
dist/devocionais.json
```

Copie um bloco existente, troque o número do `id` e escreva o novo conteúdo. Mantenha uma vírgula entre os blocos. O último bloco não leva vírgula depois da chave final.

Cada devocional usa esta estrutura:

```json
{
  "id": 15,
  "tema": "Título do devocional",
  "frase": "Frase de impacto",
  "referencia": "Referência bíblica",
  "versiculo": "Texto ou paráfrase do versículo",
  "reflexao": "Reflexão",
  "oracao": "Oração",
  "tarefa": "Tarefa prática do dia"
}
```

## Horário da mensagem

A mensagem está programada para **7h07**, no horário de Campo Grande/Dourados. Para mudar, edite:

```
.github/workflows/enviar-devocional.yml
```

O trecho `cron: "7 7 * * *"` significa 7h07 todos os dias.

## Observação importante

O GitHub pode atrasar tarefas agendadas em momentos de grande movimento. Em repositórios públicos sem nenhuma atividade por 60 dias, ele também pode desativar o agendamento. Se isso ocorrer, abra **Actions** e reative a tarefa. Para uma versão profissional com muitos usuários, vale migrar o agendamento para um serviço próprio.
