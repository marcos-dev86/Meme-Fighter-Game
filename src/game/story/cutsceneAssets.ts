/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Os vídeos das cutscenes (assets/cutscenes/<id>.mp4). Separado de cutscenes.ts para o registro continuar
 * carregável nos testes em Node. Quando um arquivo ainda não existir, o export do app falha: gere o vídeo antes.
 */
export const CUTSCENE_ASSETS: Record<string, number> = {
  '01_flashback_vovo': require('../../../assets/cutscenes/01_flashback_vovo.mp4'),
  '02_rival_gadigago': require('../../../assets/cutscenes/02_rival_gadigago.mp4'),
  '03_cassino_troll': require('../../../assets/cutscenes/03_cassino_troll.mp4'),
  '04_legiao_ferro': require('../../../assets/cutscenes/04_legiao_ferro.mp4'),
  '05_rei_dos_caes': require('../../../assets/cutscenes/05_rei_dos_caes.mp4'),
  '06_tres_fragmentos': require('../../../assets/cutscenes/06_tres_fragmentos.mp4'),
  '07_guardiao_vulcao': require('../../../assets/cutscenes/07_guardiao_vulcao.mp4'),
  '08_ilha_trevas': require('../../../assets/cutscenes/08_ilha_trevas.mp4'),
  '09_topo_do_mundo': require('../../../assets/cutscenes/09_topo_do_mundo.mp4'),
  '10_cume_vulcao': require('../../../assets/cutscenes/10_cume_vulcao.mp4'),
  '11_tres_troncos': require('../../../assets/cutscenes/11_tres_troncos.mp4'),
  '12_subsolo_cassino': require('../../../assets/cutscenes/12_subsolo_cassino.mp4'),
  '13_pedra_moai': require('../../../assets/cutscenes/13_pedra_moai.mp4'),
  final_uniao: require('../../../assets/cutscenes/final_uniao.mp4'),
  final_gloria: require('../../../assets/cutscenes/final_gloria.mp4'),
  final_poder: require('../../../assets/cutscenes/final_poder.mp4'),
};
