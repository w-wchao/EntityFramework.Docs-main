using System;
using System.Text;

namespace MyConsoleApp
{
    public static class CaptchaGenerator
    {
        private static readonly char[] _chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".ToCharArray();
        private static readonly Random _random = new Random();

        public static string GenerateVerificationCode(int length = 6)
        {
            if (length <= 0)
            {
                throw new ArgumentOutOfRangeException(nameof(length), "验证码长度必须大于0。");
            }

            var builder = new StringBuilder(length);
            for (var i = 0; i < length; i++)
            {
                builder.Append(_chars[_random.Next(_chars.Length)]);
            }

            return builder.ToString();
        }
    }
}
