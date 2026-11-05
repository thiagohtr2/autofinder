ATENÇÃO: desde a versão 87 o botão "Adicionar/Atualizar no site" do Radar grava direto em versions/models/catalog/brands
(marca change_log/<ts>-radar e versions.radar=<item>). Antes de rodar sync.py plan de novo, puxe o banco
(ArtifactData list com out_dir) e incorpore essas mudanças nos lotes, senão o plan vai reverter/apagar o que o Thiago aplicou.
