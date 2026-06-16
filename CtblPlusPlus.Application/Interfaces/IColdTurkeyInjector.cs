using System.Collections.Generic;
using System.Threading.Tasks;

namespace CtblPlusPlus.Application.AppControl;

public interface IColdTurkeyInjector
{
    bool InjectApps(IEnumerable<string> exePaths);
    bool RemoveApps(IEnumerable<string> exePaths);
    bool ForceEnforce(IEnumerable<string> intendedPaths = null);
    bool ReadBlockEnabled();
    Task StartBlock(string blockName, string password = null);
    Task StopBlock(string blockName, string password);
    void KillService();
}
