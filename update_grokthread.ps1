$path = "c:/Users/pc/OneDrive/Desktop/HandymanAI/src/components/chat/GrokThread.tsx"
$content = Get-Content -Path $path -Raw

# 1. Update createChatAdapter
$adapterSearch = '          threadContext: "web-chat",'
$adapterReplace = '          threadContext: "web-chat",
          attachments:
            messages[messages.length - 1]?.role === "user"
              ? (messages[messages.length - 1]?.content as any[])
                  ?.filter((part) => part.type === "image")
                  ?.map((part) => ({
                    dataUrl: part.image,
                    type: "image/png",
                    name: "image.png",
                    size: 0,
                  }))
              : undefined,'
$content = $content.Replace($adapterSearch, $adapterReplace)

# 2. Update ChatMessage
$messageSearch = '          <div className="text-left whitespace-pre-wrap">
            <MessagePrimitive.Content />
          </div>'
$messageReplace = '          <div className="flex flex-col gap-3">
            <MessagePrimitive.Content
              components={{
                Image: ({ component }) => {
                  if (!component?.image) return null;
                  return (
                    <div className="relative mb-2 overflow-hidden rounded-lg">
                      <Image
                        src={component.image}
                        alt="Attachment"
                        width={300}
                        height={300}
                        className="max-h-[300px] w-auto object-cover"
                        unoptimized
                      />
                    </div>
                  );
                },
                Text: ({ component }) => (
                  <div className="whitespace-pre-wrap">{component.text}</div>
                ),
              }}
            />
          </div>'
$content = $content.Replace($messageSearch, $messageReplace)

# 3. Update Composer Send Button
$sendSearch = '          <ComposerPrimitive.Send
            className={`absolute inset-0 flex items-center justify-center transition group-data-[empty=true]/composer:scale-0 group-data-[empty=true]/composer:opacity-0 ${isListening ? "pointer-events-none scale-0 opacity-0" : ""
              }`}
          >
            <ArrowUpIcon />
          </ComposerPrimitive.Send>'
$sendReplace = '          <button
            type="button"
            onClick={async () => {
              const text = api.composer().getState().text.trim();
              if (!text && !selectedFile) return;

              const content: any[] = [];

              if (selectedFile?.type.startsWith("image/")) {
                const base64 = await new Promise<string>((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.readAsDataURL(selectedFile);
                });
                content.push({ type: "image", image: base64 });
              }

              if (text) {
                content.push({ type: "text", text });
              }

              if (content.length > 0) {
                api.appendMessage({ role: "user", content });
                api.composer().setText("");
                setSelectedFile(null);
              }
            }}
            className={`absolute inset-0 flex items-center justify-center transition group-data-[empty=true]/composer:scale-0 group-data-[empty=true]/composer:opacity-0 ${isListening ? "pointer-events-none scale-0 opacity-0" : ""
              }`}
          >
            <ArrowUpIcon />
          </button>'
$content = $content.Replace($sendSearch, $sendReplace)

# 4. Update Composer Input
$inputSearch = '        <ComposerPrimitive.Input
          placeholder="Describe the problem..."
          className="min-h-[44px] w-full bg-transparent py-2.5 text-base text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
        />'
$inputReplace = '        <ComposerPrimitive.Input
          placeholder="Describe the problem..."
          className="min-h-[44px] w-full bg-transparent py-2.5 text-base text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
          onKeyDown={async (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              const text = api.composer().getState().text.trim();
              if (!text && !selectedFile) return;

              const content: any[] = [];

              if (selectedFile?.type.startsWith("image/")) {
                const base64 = await new Promise<string>((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.readAsDataURL(selectedFile);
                });
                content.push({ type: "image", image: base64 });
              }

              if (text) {
                content.push({ type: "text", text });
              }

              if (content.length > 0) {
                api.appendMessage({ role: "user", content });
                api.composer().setText("");
                setSelectedFile(null);
              }
            }
          }}
        />'
$content = $content.Replace($inputSearch, $inputReplace)

Set-Content -Path $path -Value $content -NoNewline
