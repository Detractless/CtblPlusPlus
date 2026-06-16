using CtblPlusPlus.Core.Models;

namespace CtblPlusPlus.Application.Interfaces;

public interface ICtblStateStore
{
    CtblRoot GetDbState();
    void SaveDbState(CtblRoot state);
}
