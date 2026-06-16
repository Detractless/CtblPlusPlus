using System;

namespace CtblPlusPlus.Core.Exceptions;

public class DatabaseLockedException : Exception
{
    public DatabaseLockedException(string message, Exception innerException)
        : base(message, innerException) { }
}
