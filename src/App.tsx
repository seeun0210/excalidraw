import React, { useEffect, useState, useRef, useCallback } from "react";
import { Excalidraw, MainMenu } from "@excalidraw/excalidraw";
import "./App.css";
import { ExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const dbRequest = window.indexedDB.open("excalidraw", 2);

    dbRequest.onerror = () => {
      reject(dbRequest.error);
    };

    dbRequest.onsuccess = () => {
      resolve(dbRequest.result);
    };

    dbRequest.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("drawings")) {
        db.createObjectStore("drawings", { keyPath: "id" });
      }
    };
  });
};

const saveDataToDB = async (
  elements: readonly ExcalidrawElement[]
): Promise<void> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("drawings", "readwrite");
      const store = transaction.objectStore("drawings");
      const entry = { id: "latest", elements };
      const request = store.put(entry);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error("IndexedDB에 데이터 저장 실패:", error);
  }
};

const loadDataFromDB = async (): Promise<ExcalidrawElement[] | null> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("drawings", "readonly");
      const store = transaction.objectStore("drawings");
      const request = store.get("latest");

      request.onsuccess = () => {
        const result = request.result;
        resolve(result?.elements || null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error("IndexedDB에서 데이터 로드 실패:", error);
    return null;
  }
};

function App() {
  const [isVisible, setIsVisible] = useState(true);
  const [initialData, setInitialData] = useState<{
    appState: {
      viewBackgroundColor: string;
    };
    elements: ExcalidrawElement[];
  } | null>(null);

  const debounceSave = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadDataFromDB().then((data) => {
      if (data) {
        setInitialData({
          appState: {
            viewBackgroundColor: "transparent",
          },
          elements: data,
        });
      } else {
        setInitialData({
          appState: {
            viewBackgroundColor: "transparent",
          },
          elements: [],
        });
      }
    });
  }, []);

  const handleChange = useCallback(
    (updatedElements: readonly ExcalidrawElement[]) => {
      if (debounceSave.current) {
        clearTimeout(debounceSave.current);
      }

      debounceSave.current = setTimeout(() => {
        saveDataToDB(updatedElements).catch((error) => {
          console.error("데이터 저장 중 오류 발생:", error);
        });
      }, 1000);
    },
    []
  );

  // 표시 상태 토글 함수
  const toggleVisibility = useCallback(() => {
    setIsVisible((prev) => !prev);
  }, []);

  return (
    <div
      style={{ height: "100vh", backgroundColor: "transparent" }}
      className="custom-styles"
    >
      <div
        style={{
          position: "fixed",
          bottom: 30,
          left: 30,
          zIndex: 1000,
          width: "fit-content",
          height: 50,
        }}
      >
        <button onClick={toggleVisibility}>
          {isVisible
            ? "그리기 보드 숨기기(최종버전 저장됨)"
            : "그리기 보드 보이기(indexedDB에서 불러옴)"}
        </button>
      </div>

      {initialData && (
        <div
          style={{
            display: isVisible ? "block" : "none",
            height: "100%",
            width: "100%",
          }}
        >
          <Excalidraw
            initialData={initialData}
            onChange={handleChange}
            UIOptions={{
              canvasActions: {
                changeViewBackgroundColor: true,
                clearCanvas: true,
              },
            }}
          >
            <MainMenu>
              <MainMenu.DefaultItems.LoadScene />
              <MainMenu.DefaultItems.SaveToActiveFile />
              <MainMenu.DefaultItems.Export />
              <MainMenu.DefaultItems.SaveAsImage />

              <MainMenu.DefaultItems.Help />
              <MainMenu.DefaultItems.ClearCanvas />
              <MainMenu.Separator />

              <MainMenu.DefaultItems.Socials />

              <MainMenu.Separator />

              <MainMenu.DefaultItems.ChangeCanvasBackground />
            </MainMenu>
          </Excalidraw>
        </div>
      )}
    </div>
  );
}

export default App;
