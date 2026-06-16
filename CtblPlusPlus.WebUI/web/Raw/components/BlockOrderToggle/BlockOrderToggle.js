// ============================================================
// Chunk 8 of 28
// Original lines: 3164 - 3369 (206 lines)
// Contains: emojiToText, createTextTable, sortByIndex, getClosestTimeRange, mergeConsecutiveRanges, getHumanDate, getAutostartText, toggleBlocksOrder
// ============================================================

// Utilities extracted to utils/







import { updateBlocks} from '../../pages/BlocksPage/BlocksPage';
import { getAutostartText, getHumanDate } from '../../utils/formatData';
import { getClosestTimeRange, mergeConsecutiveRanges, sortByIndex } from '../../utils/calculateTime';
import { emojiToText, createTextTable } from '../../utils/formatString';

export function toggleBlocksOrder(event) {
  if (typeof settings.additional.blocksOrder == "undefined" || settings.additional.blocksOrder == "az") {
    settings.additional.blocksOrder = "onoffaz";
  } else {
    settings.additional.blocksOrder = "az";
  }
  updateBlocks(false);
  save();
}