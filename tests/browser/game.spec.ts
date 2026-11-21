import { test, expect } from "@playwright/test";
import { planSpin } from "../../src/wheelMotion";
test("键鼠下注、奖励模式、中断恢复和领取", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "蘋果 下注 0" }).click();
  await page.keyboard.press("2");
  await page.keyboard.press("ArrowUp");
  await expect(page.locator("#v1")).toHaveText("2");
  await page.getByText("設定", { exact: true }).click();
  await page.getByText("開發除錯").click();
  await page.locator("#seed").fill("373");
  await page.locator("#useSeed").click();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Space");
  await page.locator("#start").click();
  await expect(page.locator("#state")).toContainText("特殊獎勵");
  await page.reload();
  await expect(page.locator("#state")).toContainText("等待領取");
  const value = await page.locator("#v2").innerText();
  expect(Number(value)).toBeGreaterThan(0);
  await page.keyboard.press("Enter");
  const balance = await page.locator("#v0").innerText();
  await page.reload();
  await expect(page.locator("#v0")).toHaveText(balance);
  await expect(page.locator("#v2")).toHaveText("0");
});
test("自动十局、手机横屏和桌面布局", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "設定", exact: true }).click();
  await page.getByRole("checkbox", { name: "簡化動畫" }).check();
  await page.keyboard.press("Escape");
  for (const width of [1280, 844, 320, 390]) {
    await page.setViewportSize({ width, height: width === 844 ? 390 : 800 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const panel = (await page.locator(".glass").boundingBox())!;
    const board = (await page.locator(".board").boundingBox())!;
    const tray = (await page.locator(".keytray").boundingBox())!;
    const key = (await page.locator("#fruits button").first().boundingBox())!;
    expect(panel.width / panel.height).toBeCloseTo(610 / 725);
    expect(board.width / board.height).toBeCloseTo(5 / 4);
    expect(board.y + board.height).toBeLessThan(tray.y);
    expect(key.y + key.height).toBeLessThan(tray.y + tray.height);
  }
  await page.locator('[data-i="0"]').click();
  await page.locator("#auto").click();
  await expect(page.locator("#auto")).toHaveText("自動遊戲", {
    timeout: 20000,
  });
  await page.locator("#history").click();
  await expect(page.locator("article")).toContainText("已玩 10 局");
});

test("默认完整跑灯，停灯后才亮得分，简化动画可手动保存", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    if (!localStorage.getItem("fruit.settings"))
      localStorage.setItem("fruit.settings", JSON.stringify({ simple: true, volume: 0.25 }));
    // Lock the winning position and presentation path for this isolated game.
    crypto.randomUUID = () => "00000000-0000-4000-8000-000000000001";
    const secureRandom = crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues = (target) => {
      if (target instanceof Uint32Array && target.length === 1) {
        target[0] = 0;
        return target;
      }
      return secureRandom(target);
    };
  });
  await page.goto("/");
  const settings = page.getByRole("button", { name: "設定", exact: true });
  const simple = page.getByRole("checkbox", { name: "簡化動畫" });
  await settings.click();
  await expect(simple).not.toBeChecked();
  await expect(page.locator("#volume")).toHaveValue("0.25");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "橘子 下注 0" }).click();

  const start = page.locator("#start");
  const score = page.locator("#v2");
  const { duration } = planSpin(0, 0, "00");
  const now = new Date();
  await page.clock.install({ time: now });
  await page.clock.pauseAt(new Date(now.getTime() + 1000));
  await start.dispatchEvent("click");
  await page.clock.runFor(duration - 80);
  await expect(page.locator("#state")).toContainText("跑燈中");
  await expect(score).toHaveText("0");
  await page.clock.runFor(160);
  await expect(score).toHaveText("10");
  await expect(page.locator("#state")).toContainText("等待領取");

  await page.clock.resume();
  await settings.click();
  await simple.check();
  await page.reload();
  await settings.click();
  await expect(simple).toBeChecked();
});
