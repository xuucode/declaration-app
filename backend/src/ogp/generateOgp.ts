import satori from 'satori';
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

let fontRegular: Buffer | undefined;
let fontBold: Buffer | undefined;

const loadFonts = () => {
  fontRegular ??= readFileSync(join(__dirname, '../../fonts/NotoSansJP-Regular.ttf'));
  fontBold ??= readFileSync(join(__dirname, '../../fonts/NotoSansJP-Bold.ttf'));

  return { fontRegular, fontBold };
};

export type OgpType = 'declaration' | 'done' | 'failed';

interface OgpOptions {
  type: OgpType;
  title: string;
  displayName: string;
  streakCount?: number;
}

export const generateOgpImage = async (options: OgpOptions): Promise<Buffer> => {
  const { type, title, displayName, streakCount } = options;
  const fonts = loadFonts();

  const bgColor = type === 'done' ? '#1a8a4a' : type === 'failed' ? '#c0392b' : '#1a1a2e';
  const statusText = type === 'done' ? '🎉 達成しました！' : type === 'failed' ? '😔 未達成でした' : '🔥 宣言しました！';

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: '1200px',
          height: '630px',
          backgroundColor: bgColor,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '60px',
          fontFamily: 'NotoSansJP',
        },
        children: [
          {
            type: 'div',
            props: {
              style: {
                fontSize: '36px',
                color: '#ffffff',
                marginBottom: '24px',
                fontWeight: 'bold',
              },
              children: statusText,
            },
          },
          {
            type: 'div',
            props: {
              style: {
                fontSize: '52px',
                color: '#ffffff',
                fontWeight: 'bold',
                textAlign: 'center',
                lineHeight: '1.4',
                marginBottom: '40px',
              },
              children: title,
            },
          },
          {
            type: 'div',
            props: {
              style: {
                fontSize: '28px',
                color: '#cccccc',
              },
              children: `by ${displayName}${streakCount ? `　🔥 ${streakCount}日連続達成中` : ''}`,
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'NotoSansJP', data: fonts.fontRegular, weight: 400 },
        { name: 'NotoSansJP', data: fonts.fontBold, weight: 700 },
      ],
    }
  );

  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return png;
};
