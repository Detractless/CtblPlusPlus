/**
 * @file BlockCard.js
 * @layer Component
 * @description Renders a single block card in the Blocks list.
 */

import { editAutostart } from '../AutostartEditor/AutostartEditor';
import { editFrozenList } from '../FrozenListEditor/FrozenListEditor';
import { toggleBlock } from '../../services/blockManager';
import { deleteList } from '../StatsModal/StatsModal';
import { toHtml } from '../../utils/formatString';
import { editList } from '../../pages/ListEditorPage/ListEditorPage';
import { editLock } from '../../pages/LockEditorPage/LockEditorPage';
import { editSchedule } from '../../pages/ScheduleEditorPage/ScheduleEditorPage';

export function BlockCard(props) {
    var blockNameHtml = toHtml(props.blockName.replace(/'/g, "\\'")).replace(/"/g, "\\\"");
    var lowercaseName = props.isFrozen ? props.frozenDisplayName.toLowerCase() : props.blockName.toLowerCase();
    var alphabeticalOrderDataAttr = props.alphabeticalOrderData + toHtml(lowercaseName.replace(/'/g, "\\'")).replace(/"/g, "\\\"");
    
    var titleAction = props.isFrozen ? "editFrozenList" : "editList";
    var titleText = props.isFrozen 
        ? "This block will " + props.frozenDescription + ". Click to edit..."
        : props.webCount + " websites, " + props.exceptionCount + " exceptions and " + props.appCount + " apps. Click to edit block...";
    var displayTitle = props.isFrozen ? toHtml(props.frozenDisplayName) : toHtml(props.blockName);
    
    var toggleSection = "";
    if (props.isFrozen) {
        toggleSection = props.toggleButtonHtml;
    } else {
        var autostartLock = props.autostartColorClass == "green" ? props.lockTypeData : "false";
        toggleSection = "<a class=\"list-link autostart action-request-unlock " + props.autostartColorClass + "\" data-unlock-action=\"editAutostart\" data-blockname=\"" + blockNameHtml + "\" data-locktype=\"" + autostartLock + "\" data-unlock-param=\"true\"><i class=\"fa fa-magic\" title=\"" + props.autostartText + "Click to edit...\"></i></a> <label class=\"toggle\"><input type=\"checkbox\" class=\"action-request-unlock-checkbox\" data-unlock-action=\"toggleBlock\" data-blockname=\"" + blockNameHtml + "\" data-locktype=\"" + props.lockToggleData + "\" data-unlock-param=\"false\" " + props.checkedAttribute + props.disabledAttribute + "/><div data-off=\"Off\" data-on=\"On\"></div></label>";
    }

    var html = "<div data-alphabeticalOrder=\"" + alphabeticalOrderDataAttr + "\" class=\"form-group block-card " + props.activeClass + "\">" +
        "<div class=\"row\">" +
            "<div class=\"col-sm-9 block-title\">" +
                "<a class=\"list-link action-request-unlock\" data-unlock-action=\"" + titleAction + "\" data-blockname=\"" + blockNameHtml + "\" data-locktype=\"" + props.lockTypeData + "\" data-unlock-param=\"true\" title=\"" + titleText + "\">" + displayTitle + "</a>" +
                "<span class=\"block-toolbar\">" +
                    "<a class=\"hover-button list-link action-edit-list-name\" data-blockname=\"" + blockNameHtml + "\"><i class=\"fa fa-pencil-square-o\" title=\"Rename...\"></i></a> " +
                    "<a class=\"hover-button list-link action-duplicate-list\" data-blockname=\"" + blockNameHtml + "\"><i class=\"fa fa-files-o\" title=\"Duplicate...\"></i></a> " +
                    "<a class=\"hover-button list-link action-request-unlock\" data-unlock-action=\"deleteList\" data-blockname=\"" + blockNameHtml + "\" data-locktype=\"" + props.lockTypeData + "\" data-unlock-param=\"false\"><i class=\"fa fa-trash-o\" title=\"Delete...\"></i></a>" +
                "</span>" +
            "</div>" +
            "<div class=\"col-sm-3 right\">" + toggleSection + "</div>" +
        "</div>" +
        "<div class=\"row\">" +
            "<div class=\"col-sm-3\"><a class=\"list-link action-request-unlock\" data-unlock-action=\"editSchedule\" data-blockname=\"" + blockNameHtml + "\" data-locktype=\"" + props.lockTypeData + "\" data-unlock-param=\"true\" title=\"Edit when the block is active...\">" + props.scheduleText + "</a></div>" +
            "<div class=\"col-sm-4 center\"><a class=\"list-link action-request-unlock\" data-unlock-action=\"" + props.editBreakAction + "\" data-blockname=\"" + blockNameHtml + "\" data-locktype=\"" + props.lockTypeData + "\" data-unlock-param=\"true\" title=\"Edit break...\">" + props.breakText + "</a></div>" +
            "<div class=\"col-sm-2 center\"><a class=\"list-link action-request-unlock\" data-unlock-action=\"editUsers\" data-blockname=\"" + blockNameHtml + "\" data-locktype=\"" + props.lockTypeData + "\" data-unlock-param=\"true\" title=\"Edit affected users...\">" + props.usersText + "</a></div>" +
            "<div class=\"col-sm-3 right\"><a class=\"list-link action-request-unlock\" data-unlock-action=\"editLock\" data-blockname=\"" + blockNameHtml + "\" data-locktype=\"" + props.lockTypeData + "\" data-unlock-param=\"true\" title=\"Edit lock...\">" + props.lockHtml + "</a></div>" +
        "</div>" +
    "</div>";
    
    return html;
}
